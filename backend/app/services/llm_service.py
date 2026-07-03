import time
import os
import httpx
import json
from typing import Optional, Dict, Any
from google import genai
from google.genai import types
from openai import OpenAI
import anthropic
from ..config import settings

# Gracefully import llama_cpp and huggingface_hub
try:
    from llama_cpp import Llama
    from huggingface_hub import hf_hub_download
    GGUF_AVAILABLE = True
except ImportError:
    GGUF_AVAILABLE = False


class LocalGGUFModel:
    """
    Singleton wrapper to download and load the local GGUF model in memory.
    This prevents loading the model multiple times or during startup before needed.
    """
    _instance = None

    @classmethod
    def get_instance(cls) -> Optional[Any]:
        if not GGUF_AVAILABLE:
            return None
            
        if cls._instance is None:
            repo_id = settings.MODEL_REPO_ID
            filename = settings.MODEL_BASENAME
            model_dir = settings.MODEL_DIR

            print(f"🤖 [GGUF] Initializing local model download: {filename} from {repo_id}...")
            
            try:
                # Ensure directory exists
                os.makedirs(model_dir, exist_ok=True)
                
                # Download model file using Hugging Face Hub (cached automatically)
                model_path = hf_hub_download(
                    repo_id=repo_id,
                    filename=filename,
                    local_dir=model_dir
                )
                print(f"✅ [GGUF] Model downloaded/cached at: {model_path}")
                
                # Load GGUF model in memory
                # On macOS, n_gpu_layers=-1 uses Metal framework for fast Apple Silicon GPU acceleration
                print("⚡ [GGUF] Loading Mistral-7B model into memory (GPU layers offloaded)...")
                cls._instance = Llama(
                    model_path=model_path,
                    n_ctx=2048,
                    n_gpu_layers=-1, # GPU acceleration enabled
                    verbose=False
                )
                print("🎉 [GGUF] Local model successfully initialized!")
            except Exception as e:
                print(f"❌ [GGUF] Failed to download or load local model: {str(e)}")
                cls._instance = None
                raise e
                
        return cls._instance


class LLMService:
    @staticmethod
    def call_gguf(
        prompt: str,
        system_instruction: str,
        temperature: float,
        top_p: float,
        top_k: int
    ) -> Dict[str, Any]:
        """
        Executes local inference on the Mistral-7B GGUF model.
        Format standard instructions using Mistral's [INST] prompt wrapper.
        """
        start_time = time.time()
        
        # Check availability
        if not GGUF_AVAILABLE:
            return {
                "response": "### Local GGUF Engine Offline\n\n**Reason:** `llama-cpp-python` or `huggingface-hub` is not installed or failed to import.\n\n*Please install the dependencies in the venv or refer to the local run logs.*",
                "generation_time_ms": 0,
                "token_count": 0
            }

        try:
            # Retrieve model instance (downloads and loads model if first time)
            llm = LocalGGUFModel.get_instance()
            if not llm:
                raise RuntimeError("GGUF model could not be loaded.")
            
            # Format prompt for Mistral Instruct: <s>[INST] System\nPrompt [/INST]
            formatted_prompt = f"<s>[INST] <<SYS>>\n{system_instruction}\n<</SYS>>\n\n{prompt} [/INST]"
            
            print(f"🚀 [GGUF] Executing local inference: Temp={temperature}, Top P={top_p}, Top K={top_k}...")
            
            response = llm(
                prompt=formatted_prompt,
                max_tokens=1000,
                temperature=temperature,
                top_p=top_p,
                top_k=top_k,
                stop=["</s>"]
            )
            
            text_out = response["choices"][0]["text"]
            input_tokens = response["usage"]["prompt_tokens"]
            output_tokens = response["usage"]["completion_tokens"]
            
            return {
                "response": text_out,
                "generation_time_ms": int((time.time() - start_time) * 1000),
                "token_count": input_tokens + output_tokens
            }
        except Exception as e:
            return {
                "response": f"### Local GGUF Inference Error\n\n**Details:** {str(e)}\n\n*Ensure you have enough RAM/VRAM (8-10GB) free to run the 7B parameter model.*",
                "generation_time_ms": 0,
                "token_count": 0
            }

    @staticmethod
    def call_gemini(
        prompt: str,
        system_instruction: str,
        model: str,
        api_key: str,
        temperature: float,
        top_p: float,
        top_k: int
    ) -> Dict[str, Any]:
        start_time = time.time()
        try:
            client = genai.Client(api_key=api_key)
            model_name = "gemini-1.5-flash"
            if "pro" in model.lower():
                model_name = "gemini-1.5-pro"

            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=temperature,
                top_p=top_p,
                top_k=top_k,
                max_output_tokens=1500
            )

            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=config
            )
            
            input_tokens = len(prompt.split()) + len(system_instruction.split())
            output_tokens = len(response.text.split()) if response.text else 0
            
            return {
                "response": response.text or "No response returned.",
                "generation_time_ms": int((time.time() - start_time) * 1000),
                "token_count": input_tokens + output_tokens
            }
        except Exception as e:
            raise RuntimeError(f"Gemini API Error: {str(e)}")

    @staticmethod
    def call_openai(
        prompt: str,
        system_instruction: str,
        model: str,
        api_key: str,
        temperature: float,
        top_p: float
    ) -> Dict[str, Any]:
        start_time = time.time()
        try:
            client = OpenAI(api_key=api_key)
            model_name = model if model else "gpt-4o-mini"
            
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature,
                top_p=top_p,
                max_tokens=1000
            )
            
            return {
                "response": response.choices[0].message.content,
                "generation_time_ms": int((time.time() - start_time) * 1000),
                "token_count": response.usage.total_tokens if response.usage else 0
            }
        except Exception as e:
            raise RuntimeError(f"OpenAI API Error: {str(e)}")

    @staticmethod
    def call_anthropic(
        prompt: str,
        system_instruction: str,
        model: str,
        api_key: str,
        temperature: float,
        top_p: float
    ) -> Dict[str, Any]:
        start_time = time.time()
        try:
            client = anthropic.Anthropic(api_key=api_key)
            model_name = "claude-3-5-sonnet-20241022" if "sonnet" in model.lower() else "claude-3-haiku-20240307"
            
            response = client.messages.create(
                model=model_name,
                max_tokens=1000,
                temperature=temperature,
                top_p=top_p,
                system=system_instruction,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            input_tokens = response.usage.input_tokens
            output_tokens = response.usage.output_tokens
            
            return {
                "response": response.content[0].text,
                "generation_time_ms": int((time.time() - start_time) * 1000),
                "token_count": input_tokens + output_tokens
            }
        except Exception as e:
            raise RuntimeError(f"Anthropic API Error: {str(e)}")

    @staticmethod
    def call_custom_llm(
        prompt: str,
        system_instruction: str,
        endpoint_url: str,
        api_key: Optional[str],
        model_name: str,
        temperature: float,
        top_p: float,
        top_k: Optional[int] = None
    ) -> Dict[str, Any]:
        start_time = time.time()
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        payload = {
            "model": model_name or "custom-model",
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ],
            "temperature": temperature,
            "top_p": top_p,
            "max_tokens": 1000
        }
        if top_k is not None:
            payload["top_k"] = top_k

        try:
            url = endpoint_url
            if not url.endswith("/chat/completions") and not url.endswith("/generate"):
                if "v1" in url or "api" in url:
                    url = url.rstrip("/") + "/chat/completions"

            with httpx.Client(timeout=30.0) as client:
                response = client.post(url, json=payload, headers=headers)
                
                if response.status_code != 200:
                    raw_text = response.text
                    raise RuntimeError(f"Custom LLM API returned status {response.status_code}: {raw_text}")
                
                res_data = response.json()
                
                if "choices" in res_data and len(res_data["choices"]) > 0:
                    text_out = res_data["choices"][0]["message"]["content"]
                    tokens = res_data.get("usage", {}).get("total_tokens", len(prompt.split()) + len(text_out.split()))
                elif "response" in res_data:
                    text_out = res_data["response"]
                    tokens = len(prompt.split()) + len(text_out.split())
                elif "text" in res_data:
                    text_out = res_data["text"]
                    tokens = len(prompt.split()) + len(text_out.split())
                else:
                    text_out = json.dumps(res_data)
                    tokens = len(prompt.split())

                return {
                    "response": text_out,
                    "generation_time_ms": int((time.time() - start_time) * 1000),
                    "token_count": tokens
                }
        except Exception as e:
            raise RuntimeError(f"Custom LLM Connection Error: {str(e)}")

    @staticmethod
    def call_mock_llm(
        prompt: str,
        system_instruction: str,
        model: str,
        temperature: float,
        top_p: float,
        top_k: int
    ) -> Dict[str, Any]:
        start_time = time.time()
        time.sleep(0.6)
        
        response_text = ""
        if "summarize" in prompt.lower() or "summary" in prompt.lower():
            response_text = (
                f"### [Simulated Summary - Mistral Local Mode]\n\n"
                f"**System Role Configured:** {system_instruction}\n"
                f"**Parameters Passed:** (Temp: {temperature}, Top P: {top_p}, Top K: {top_k})\n\n"
                f"Based on the provided document context, here is the local summary:\n\n"
                f"1. **Local Run Mode:** Serving Mistral-7B-Instruct-v0.2 locally from GGUF file.\n"
                f"2. **Configuration Performance:** Temp set to {temperature} gives balanced and controlled output.\n"
                f"3. **Inference Status:** Simulated output matches parameter constraints."
            )
        elif "entity" in prompt.lower() or "extract" in prompt.lower():
            response_text = (
                f"### [Simulated Entity Extraction - Mistral Local Mode]\n\n"
                f"**Persona Applied:** {system_instruction}\n\n"
                f"| Entity Name | Entity Type | Details (Local Mode) |\n"
                f"| :--- | :--- | :--- |\n"
                f"| Mistral-7B | Model | Local GGUF Engine |\n"
                f"| TheBloke | Repository | Hugging Face Source |\n"
                f"| Q6_K | Quantization | High-fidelity local format |\n"
            )
        else:
            response_text = (
                f"### [Simulated Response - Local Mistral-7B-Instruct]\n\n"
                f"**System Instruction:** {system_instruction}\n"
                f"**Parameters:** Temp={temperature}, Top P={top_p}, Model={model}\n\n"
                f"This is a high-fidelity preview simulating local execution. If the dependencies are installed and the model is downloaded, this text would be generated token-by-token directly by Mistral-7B in real-time."
            )

        generation_time = int((time.time() - start_time) * 1000)
        tokens = len(prompt.split()) + len(response_text.split()) + 45
        
        return {
            "response": response_text,
            "generation_time_ms": generation_time,
            "token_count": tokens
        }

    @classmethod
    def execute_query(
        cls,
        prompt: str,
        system_instruction: str,
        model: str,
        config: Dict[str, Any],
        temperature: float,
        top_p: float,
        top_k: int
    ) -> Dict[str, Any]:
        """
        Routes the query. Resolves local GGUF execution, custom LLMs, cloud APIs, or fallback mock.
        """
        # If GGUF is chosen or if no cloud API keys are present and custom LLM is disabled, we run GGUF!
        if "gguf" in model.lower() or "mistral" in model.lower():
            if GGUF_AVAILABLE:
                return cls.call_gguf(prompt, system_instruction, temperature, top_p, top_k)
            else:
                # Tell the user to install dependencies if not available
                return {
                    "response": "### Local GGUF Serving Offline\n\n**Reason:** `llama-cpp-python` is not available in the active environment. \n\n*Ensure you have activated the virtual environment and installed all packages from `requirements.txt` (see local run instructions in README).* \n\n*Falling back to mock output below:*\n\n" + 
                                cls.call_mock_llm(prompt, system_instruction, model, temperature, top_p, top_k)["response"],
                    "generation_time_ms": 600,
                    "token_count": 150
                }

        # 1. Custom Customer LLM Endpoint
        if config.get("custom_llm_enabled") and config.get("custom_llm_url"):
            try:
                return cls.call_custom_llm(
                    prompt=prompt,
                    system_instruction=system_instruction,
                    endpoint_url=config.get("custom_llm_url"),
                    api_key=config.get("custom_llm_key"),
                    model_name=config.get("custom_llm_model"),
                    temperature=temperature,
                    top_p=top_p,
                    top_k=top_k
                )
            except Exception as e:
                return {
                    "response": f"### Error connecting to Custom LLM Endpoint\n\n**Details:** {str(e)}",
                    "generation_time_ms": 0,
                    "token_count": 0
                }

        # 2. Cloud APIs
        if "gemini" in model.lower():
            api_key = config.get("gemini_api_key") or settings.GEMINI_API_KEY
            if api_key:
                try:
                    return cls.call_gemini(prompt, system_instruction, model, api_key, temperature, top_p, top_k)
                except Exception as e:
                    return {"response": f"Gemini API Error: {str(e)}", "generation_time_ms": 0, "token_count": 0}
            
        elif "gpt" in model.lower() or "openai" in model.lower():
            api_key = config.get("openai_api_key") or settings.OPENAI_API_KEY
            if api_key:
                try:
                    return cls.call_openai(prompt, system_instruction, model, api_key, temperature, top_p)
                except Exception as e:
                    return {"response": f"OpenAI API Error: {str(e)}", "generation_time_ms": 0, "token_count": 0}

        elif "claude" in model.lower() or "anthropic" in model.lower():
            api_key = config.get("anthropic_api_key") or settings.ANTHROPIC_API_KEY
            if api_key:
                try:
                    return cls.call_anthropic(prompt, system_instruction, model, api_key, temperature, top_p)
                except Exception as e:
                    return {"response": f"Anthropic API Error: {str(e)}", "generation_time_ms": 0, "token_count": 0}

        # 3. Default local GGUF fallback if GGUF is available, otherwise mock
        if GGUF_AVAILABLE:
            return cls.call_gguf(prompt, system_instruction, temperature, top_p, top_k)
            
        return cls.call_mock_llm(prompt, system_instruction, model, temperature, top_p, top_k)
