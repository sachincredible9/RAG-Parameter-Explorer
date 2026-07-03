from typing import List, Dict, Any

class ChunkingService:
    @staticmethod
    def chunk_text(text: str, chunk_size: int, chunk_overlap: int) -> List[Dict[str, Any]]:
        """
        Split a string into chunks of chunk_size characters with a chunk_overlap.
        Returns a list of dictionaries with content, start_char, and end_char.
        """
        chunks = []
        if not text:
            return chunks

        # Bound inputs to avoid infinite loops or memory errors
        chunk_size = max(100, min(chunk_size, 5000))
        chunk_overlap = max(0, min(chunk_overlap, chunk_size - 50))
        
        text_len = len(text)
        start = 0
        chunk_index = 0
        
        while start < text_len:
            end = min(start + chunk_size, text_len)
            
            # Extract chunk content
            content = text[start:end]
            chunks.append({
                "chunk_index": chunk_index,
                "content": content,
                "start_char": start,
                "end_char": end
            })
            
            if end == text_len:
                break
                
            # Move start by step (size - overlap)
            step = chunk_size - chunk_overlap
            start += step
            chunk_index += 1
            
        return chunks

    @staticmethod
    def find_relevant_chunks(query: str, chunks: List[Dict[str, Any]], top_k: int = 3) -> List[Dict[str, Any]]:
        """
        A helper keyword/TF-IDF based search to retrieve the most relevant chunks 
        for a query without requiring a vector database (perfect for local POC / sqlite).
        Computes relevance using Jaccard Similarity / keyword overlap.
        """
        query_words = set(query.lower().split())
        scored_chunks = []

        for chunk in chunks:
            content_words = set(chunk["content"].lower().split())
            if not query_words:
                score = 0.0
            else:
                intersection = query_words.intersection(content_words)
                union = query_words.union(content_words)
                # Jaccard overlap score plus some bonus for exact substring match
                score = len(intersection) / len(union) if union else 0.0
                if query.lower() in chunk["content"].lower():
                    score += 0.5 # boost exact match

            scored_chunks.append({
                "chunk_index": chunk["chunk_index"],
                "content": chunk["content"],
                "score": round(score, 4)
            })

        # Sort by score descending and return top_k
        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        return scored_chunks[:top_k]
