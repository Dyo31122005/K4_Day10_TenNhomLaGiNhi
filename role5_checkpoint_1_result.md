# Checkpoint 1 Walkthrough

Tôi đã hoàn thành toàn bộ các đầu việc và tiêu chí nghiệm thu của **Checkpoint 1** (Vai trò 5 - Đánh giá & Giám sát dữ liệu) và chạy thành công pha baseline (`phase1.py`).

---

## 1. Kết quả Chạy thử nghiệm Baseline (Phase 1 Results)

Tiến trình chạy nền đã kết thúc thành công với các chỉ số RAG Agent hoàn hảo:
*   **Số lượng câu hỏi đánh giá**: 12 câu (bao gồm 3 bài báo tiêu biểu $\times$ 4 nhóm câu hỏi: `summary`, `authors`, `date`, `categories`).
*   **Retrieval Hit Rate**: **100.0%** (Truy xuất chính xác 100% tài liệu nguồn).
*   **Mean Token F1-score**: **1.0000** (Câu trả lời trùng khớp hoàn toàn với Ground Truth).
*   **LLM Judge (OpenAI gpt-4o-mini)**: Đã đánh giá và chấm điểm tối đa **5/5** cho tất cả các câu trả lời.

---

## 2. Kiểm định Chất lượng Dữ liệu (Data Quality & Freshness)

Các kiểm định chất lượng tại [quality.py](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/src/observability/quality.py) đã chạy và lưu trữ kết quả:
1.  **Row Count Check**: **PASS** (Tìm thấy 24 bản ghi sạch, đạt yêu cầu tối thiểu $\ge 20$).
2.  **Paper ID Not Null**: **PASS** (Không có dòng nào thiếu ID).
3.  **Paper ID Unique**: **PASS** (Không có ID trùng lặp).
4.  **Title Not Null**: **PASS** (Mọi bài báo đều có tiêu đề).
5.  **Summary Length Check**: **PASS** (Tất cả tóm tắt đều dài trên 100 ký tự).
6.  **Freshness Check**: **PASS** (Các bài báo đều nằm trong khoảng thời gian tươi mới $\le 180$ ngày).

---

## 3. Các Artifacts đã được tạo ra

Tất cả các tệp đầu ra được lưu trữ chính xác tại các đường dẫn quy định:
*   **Bộ câu hỏi kiểm thử**: [test_set.json](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/data/eval/test_set.json)
*   **Câu trả lời chi tiết**: [baseline_answers.json](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/data/results/baseline_answers.json)
*   **Chỉ số tổng hợp**: [baseline_metrics.json](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/data/results/baseline_metrics.json)
*   **Báo cáo chất lượng**: [baseline_quality_report.json](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/data/quality/baseline_quality_report.json)
*   **Báo cáo Freshness**: [freshness_report.json](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/data/quality/freshness_report.json)
*   **Tệp Cache LLM Judge**: [judge_cache.json](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/data/results/judge_cache.json) (Giúp tăng tốc các lượt đánh giá sau).
*   **Báo cáo tổng hợp Baseline Markdown**: [phase1_report.md](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/data/reports/phase1_report.md)
