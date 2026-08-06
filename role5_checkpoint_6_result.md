# Checkpoint 6 Walkthrough (Role 5)

Tôi đã tạo tệp so sánh tổng hợp cuối cùng để chứng minh định lượng tác động của chất lượng dữ liệu đối với hiệu năng của hệ thống RAG.

---

## 1. Báo cáo so sánh (corruption_report.md)
Báo cáo hoàn chỉnh so sánh 3 trạng thái dữ liệu đã được xuất bản tại [corruption_report.md](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/data/reports/corruption_report.md).

Bảng so sánh hiệu năng tổng hợp:

| Chỉ số | Baseline (Sạch) | Corrupted (Lỗi) | Repaired (Sửa) | Delta (Lỗi vs Baseline) | Trạng thái phục hồi |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Retrieval Hit Rate** | 100.0% | 33.3% | 100.0% | **-66.7%** | Khôi phục 100% |
| **Mean Token F1** | 1.0000 | 0.4600 | 1.0000 | **-0.5400** | Khôi phục 100% |
| **LLM Judge Accuracy** | 100.0% | 41.7% | 100.0% | **-58.3%** | Khôi phục 100% |
| **Mean Judge Score** | 5.00 | 3.08 | 5.00 | **-1.92** | Khôi phục 100% |
| **Quality Status** | PASS | **FAIL** | PASS | - | Khôi phục 100% |
| **Freshness Status** | FRESH | **STALE** | FRESH | - | Khôi phục 100% |

---

## 2. Kết luận chứng minh chất lượng dữ liệu ảnh hưởng đến RAG
Báo cáo trên đã chứng minh rõ ràng:
1.  **Dữ liệu xấu làm giảm nghiêm trọng khả năng truy xuất của RAG**: Cắt cụt tiêu đề hoặc xóa tài liệu làm giảm Hit Rate xuống còn **33.3%** (mất 66.7% thông tin).
2.  **Dữ liệu bẩn làm LLM sinh câu trả lời sai lệch**: Khi tóm tắt bị chèn từ rác hoặc bị xóa, Token F1 của Agent giảm xuống còn **0.4600**, và độ chính xác của câu trả lời theo đánh giá của LLM Judge chỉ còn **41.7%** (giảm 58.3%).
3.  **Quy trình khôi phục hoàn hảo**: Khi chạy phục hồi dữ liệu từ nguồn raw, tất cả các chỉ số chất lượng và hiệu năng của RAG Agent đều quay lại mức tối đa ban đầu.
