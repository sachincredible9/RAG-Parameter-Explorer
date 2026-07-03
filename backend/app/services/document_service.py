import io
from pypdf import PdfReader

class DocumentService:
    @staticmethod
    def extract_text(file_bytes: bytes, file_name: str) -> str:
        """
        Extract text content from uploaded files. Supports PDF and TXT.
        """
        if file_name.lower().endswith(".pdf"):
            try:
                pdf_file = io.BytesIO(file_bytes)
                reader = PdfReader(pdf_file)
                text_list = []
                for page_num, page in enumerate(reader.pages):
                    page_text = page.extract_text()
                    if page_text:
                        text_list.append(page_text)
                return "\n\n--- Page Break ---\n\n".join(text_list)
            except Exception as e:
                raise ValueError(f"Error parsing PDF file: {str(e)}")
        else:
            # Fallback to UTF-8 text file parsing
            try:
                return file_bytes.decode("utf-8", errors="ignore")
            except Exception as e:
                raise ValueError(f"Error decoding text file: {str(e)}")
