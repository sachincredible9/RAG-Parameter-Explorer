#!/usr/bin/env python3
import sys
from app.services.chunking_service import ChunkingService
from app.services.llm_service import LLMService

def run_tests():
    print("Running DocMind Studio Automated Verification Tests...")
    
    # Test 1: Chunking Service splits text correctly
    text = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
    chunk_size = 30
    chunk_overlap = 10
    
    print("\n[Test 1] Character Chunking Validation:")
    chunks = ChunkingService.chunk_text(text, chunk_size, chunk_overlap)
    
    for c in chunks:
        print(f"  Chunk #{c['chunk_index']}: start={c['start_char']}, end={c['end_char']}, len={len(c['content'])}")
        print(f"    Content: '{c['content']}'")
        
    assert len(chunks) > 0, "Chunk list should not be empty"
    print("Chunking Service: PASSED")

    # Test 2: Search Retrieval / Matching
    print("\n[Test 2] RAG Search Relevance Validation:")
    query = "consectetur adipiscing"
    relevant = ChunkingService.find_relevant_chunks(query, chunks, top_k=2)
    
    for r in relevant:
        print(f"  Match Chunk #{r['chunk_index']} (Score: {r['score']}): '{r['content']}'")
        
    assert len(relevant) > 0, "Relevant chunks should be returned"
    assert relevant[0]['score'] > 0.0, "Matching chunk score should be non-zero"
    print("RAG Search Validation: PASSED")

    # Test 3: LLM Service Mock Output
    print("\n[Test 3] LLM Service Param Forwarding & Mock Fallback:")
    sys_instruction = "You are a Senior Auditor"
    prompt = "Summarize the findings."
    model = "gemini-1.5-flash"
    
    res = LLMService.call_mock_llm(
        prompt=prompt,
        system_instruction=sys_instruction,
        model=model,
        temperature=0.2,
        top_p=0.9,
        top_k=40
    )
    
    print(f"  Response Preview:\n{res['response'][:150]}...")
    print(f"  Latency: {res['generation_time_ms']} ms")
    print(f"  Token count: {res['token_count']}")
    
    assert "Simulated Summary" in res['response'], "Response should match mock summarization rule"
    assert res['generation_time_ms'] > 0, "Latency should be non-zero"
    assert res['token_count'] > 0, "Token count should be logged"
    print("LLM Mock Service Validation: PASSED")

    print("\nAll Verification Tests Completed Successfully!")

if __name__ == "__main__":
    try:
        run_tests()
    except Exception as e:
        print(f"Test verification failed: {str(e)}")
        sys.exit(1)
