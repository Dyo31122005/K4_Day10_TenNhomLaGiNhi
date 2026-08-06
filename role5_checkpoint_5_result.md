# Checkpoint 5 Walkthrough (Role 5)

Tôi đã xác minh quy trình khôi phục dữ liệu (Data Repair) và đánh giá khả năng phục hồi hiệu năng của RAG Agent.

---

## 1. Quy trình khôi phục và chỉ số sau sửa lỗi (Repaired)
Sau khi chạy quy trình sửa lỗi tự động bằng cách tải lại dữ liệu sạch từ nguồn snapshot raw:
*   **Dữ liệu thô phục hồi**: Số lượng dòng trong dataframe quay lại mốc sạch **24 dòng**.
*   **Retrieval Hit Rate**: Phục hồi hoàn toàn về **100.0%** (Tìm thấy 100% tài liệu đúng).
*   **Mean Token F1-score**: Phục hồi hoàn toàn về **1.0000** (Câu trả lời khớp tuyệt đối).
*   **LLM Judge Accuracy**: Phục hồi về **100.0%** (Tất cả câu trả lời được đánh giá là ĐÚNG).
*   **Mean Judge Score (1-5)**: Quay lại mức tối đa **5.00**.

---

## 2. Kiểm định chất lượng sau khôi phục
*   **Quality Status**: **PASS** (Không còn trùng lặp ID, không còn tiêu đề rỗng).
*   **Freshness Status**: **FRESH** (Ngày xuất bản quay lại đúng mốc tươi mới thực tế, 0 dòng stale).

Báo cáo chất lượng sau sửa lỗi đã được lưu tại:
- [repaired_quality_report.json](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/data/quality/repaired_quality_report.json)
- [repaired_freshness_report.json](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/data/quality/repaired_freshness_report.json)
