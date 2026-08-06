# Checkpoint 3 Walkthrough (Role 5)

Tôi đã chạy thử nghiệm toàn chỉnh luồng Baseline End-to-End (`phase1.py`), kiểm tra chéo các artifacts và phân tích cụ thể kết quả truy vấn của RAG Agent.

---

## 1. Kết quả chỉ số Baseline (baseline_metrics.json)
Chỉ số đánh giá tổng hợp trên 24 câu hỏi của bộ kiểm thử:
*   **Tổng số câu hỏi kiểm thử**: 24 câu (6 papers $\times$ 4 loại câu hỏi).
*   **Retrieval Hit Rate**: **1.0** (100% - Mọi câu hỏi đều tìm thấy tài liệu chứa thông tin chính xác).
*   **Mean Token F1**: **1.0** (100% - Câu trả lời của RAG khớp tuyệt đối về mặt ký tự với Ground Truth).
*   **Judge Accuracy**: **1.0** (100% - Mô hình GPT-4o-mini đánh giá câu trả lời là chính xác).
*   **Mean Judge Score**: **5.0 / 5** (Chấm điểm chất lượng đạt điểm tối đa).

---

## 2. Phân tích mẫu kiểm thử (Hit/Miss Analysis)

Tôi đã phân tích mẫu câu hỏi **`q_001`** (loại câu hỏi `summary` cho bài báo `Hi-RAG`):
- **Question**: `"Provide a summary of the paper 'Hi‐ RAG : A Hierarchical Retrieval‐Augmented Generation Framework for Scalable and Generalisable Tool Selection in Large Language Model Agents'"`
- **Ground Truth Doc ID**: `["10.1111/exsy.70341"]`
- **Retrieval Hit**: **TRUE**. Vector index ChromaDB đã trả về tài liệu `"10.1111/exsy.70341"` ở vị trí đầu tiên (Rank 1).
- **RAG Answer**: `"ABSTRACT As tool repositories for Large Language Model (LLM) agents grow from dozens to hundreds of endpoints, flat retrieval paradigms that treat the repository as an unstructured list suffer from context overload, cross‐domain semantic collision and degraded selection accuracy."`
- **Token F1**: **1.0**. Câu trả lời khớp hoàn toàn với Ground Truth.
- **LLM Judge Verdict**: **5/5 (Correct: True)**.
  * *Reasoning*: `"The model answer is an exact character-for-character match of the provided reference answer, indicating perfect alignment with the expected ground truth."`

---

## 3. Xác minh tính đồng bộ của Artifacts (Artifact Alignment)
Các tệp dữ liệu sạch, cơ sở dữ liệu vector, và báo cáo hoàn toàn khớp nhau:
- [papers_clean.csv](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/data/clean/papers_clean.csv) chứa đúng 24 bản ghi sạch.
- [papers_embeddings.json](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/data/embeddings/papers_embeddings.json) chứa đúng 24 vector tương ứng.
- [baseline_quality_report.json](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/data/quality/baseline_quality_report.json) ghi nhận trạng thái **PASS** cho toàn bộ 24 bản ghi sạch này.
- [phase1_report.md](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/data/reports/phase1_report.md) hiển thị đúng số lượng 24 mẫu kiểm thử cùng các chỉ số trên.
