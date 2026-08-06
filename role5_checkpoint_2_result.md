# Checkpoint 2 Walkthrough (Role 5)

Tôi đã thực hiện các kiểm tra và xác minh cần thiết cho **Checkpoint 2** (Vai trò 5 - Đánh giá & Giám sát dữ liệu).

---

## 1. Tiêu chí hoàn thành (Pass Criteria)
- [x] Tệp `test_set.json` tồn tại và hợp lệ.
- [x] Tệp manifest embedding `papers_embeddings.json` tồn tại và hợp lệ.
- [x] Cơ sở dữ liệu Vector (Chroma collection `papers-baseline`) hoạt động bình thường.
- [x] Các tính năng Semantic Search và Exact Lookup đều trả về kết quả đúng nguồn.

---

## 2. Kết quả kiểm tra & Xác minh chi tiết

### A. Xác minh tính liên kết ID (ID Integrity Check)
Tôi đã chạy một script kiểm tra chéo giữa tập test và vector index:
- Đọc tất cả các `ground_truth_doc_ids` trong [test_set.json](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/data/eval/test_set.json).
- Đọc tất cả các `paper_id` được index trong [papers_embeddings.json](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/data/embeddings/papers_embeddings.json).
- **Kết quả**: 100% các `paper_id` được tham chiếu trong tập test đều **tồn tại thực tế** và khớp chính xác với cơ sở dữ liệu vector.

### B. Kiểm tra nhanh chức năng truy xuất (Retrieval Smoke Test)
Tôi đã thực hiện một truy vấn tìm kiếm thử nghiệm với từ khóa `'Hi-RAG'`:
- **Kết quả trả về**:
  * Title: `"A Survey of (Deep RAG) Deep Retrieval Augmented Generation and Reasoning in Large Language Models"`
  * Trích xuất context và metadata đầy đủ, không lỗi.

### C. Đánh giá chất lượng dữ liệu Baseline (Observability Evidence)
- Các file giám sát [baseline_quality_report.json](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/data/quality/baseline_quality_report.json) và [freshness_report.json](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/data/quality/freshness_report.json) đã lưu lại đầy đủ bằng chứng giám sát (dữ liệu sạch, 0 dòng stale, 0 dòng null, 0 dòng duplicate).
