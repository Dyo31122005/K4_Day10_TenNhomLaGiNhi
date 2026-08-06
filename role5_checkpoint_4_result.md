# Checkpoint 4 Walkthrough (Role 5)

Tôi đã chạy pha giả lập lỗi dữ liệu (Data Corruption) và đánh giá tác động của dữ liệu bẩn lên hiệu năng của RAG Agent.

---

## 1. Kết quả chỉ số khi dữ liệu bị lỗi (Corrupted)
So sánh trực tiếp với Baseline:
*   **Retrieval Hit Rate**: Giảm mạnh từ **100.0%** xuống còn **33.3%** (Chỉ truy xuất được 1/3 thông tin đúng do tiêu đề bị cắt cụt và một số dòng bị xóa).
*   **Mean Token F1-score**: Giảm từ **1.0000** xuống còn **0.4600** (Các câu trả lời bị cụt, sai lệch thông tin hoặc rỗng).
*   **LLM Judge Accuracy**: Giảm từ **100.0%** xuống còn **41.7%** (GPT-4o-mini đánh giá phần lớn câu trả lời của Agent trên dữ liệu bẩn là SAI).
*   **Mean Judge Score (1-5)**: Sụt giảm nghiêm trọng từ **5.00** xuống còn **3.08**.

---

## 2. Kết quả kiểm định giám sát dữ liệu lỗi (Observability)
*   **Quality Status**: **FAIL** (Phát hiện lỗi trùng lặp ID và tiêu đề trống).
*   **Freshness Status**: **STALE** (Phát hiện bản ghi cũ vượt quá ngưỡng 180 ngày do năm xuất bản bị đẩy lùi về quá khứ).

Chi tiết báo cáo lỗi được ghi nhận tại:
- [corrupted_quality_report.json](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/data/quality/corrupted_quality_report.json)
- [corrupted_freshness_report.json](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/data/quality/corrupted_freshness_report.json)
