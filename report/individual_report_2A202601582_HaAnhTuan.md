# Member Role Report — Day 10: Data Pipeline & Data Observability

## 1. Thông tin cá nhân

| Thông tin         | Nội dung                  |
| ------------------ | -------------------------- |
| Họ và tên       | Hà Anh Tuấn             |
| MSSV               | 2A202601582                     |
| Khóa/Lớp         | K4              |
| Tên nhóm         | TenNhomLaGiNhi     |
| Vai trò chính    | Vai trò 5: Đánh giá RAG & Giám sát dữ liệu (Evaluation & Observability Owner)                 |
| Repository         | [github.com/Dyo31122005/K4_Day10_TenNhomLaGiNhi](https://github.com/Dyo31122005/K4_Day10_TenNhomLaGiNhi) |
| Ngày hoàn thành | 2026-08-06               |

## 2. Vai trò và phạm vi công việc

### Phần việc sở hữu

| Module/deliverable | File/hàm phụ trách | Input nhận vào | Output bàn giao  | Trạng thái |
| ------------------ | --------------------- | ---------------- | ----------------- | -------------------------------------------- |
| Sinh bộ câu hỏi đánh giá | [testset.py](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/src/evaluation/testset.py): `build_test_set` | Cleaned DataFrame | [test_set.json](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/data/eval/test_set.json) (12 câu hỏi) | Hoàn thành |
| Đánh giá RAG Agent | [metrics.py](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/src/evaluation/metrics.py): `evaluate_pipeline`, `_judge_answer`, `_token_f1` | `test_set.json` + Chroma Index | Answers & Metrics JSON (baseline, corrupted, repaired) | Hoàn thành |
| Kiểm định Chất lượng Dữ liệu | [quality.py](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/src/observability/quality.py): `run_data_quality_checks`, `build_freshness_report` | Dataset DataFrame | Quality & Freshness JSON reports | Hoàn thành |
| Báo cáo Giám sát Markdown | [reporting.py](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/src/observability/reporting.py): `generate_phase1_report`, `generate_corruption_report` | Quality JSONs + Metrics JSONs | Báo cáo Markdown (`phase1_report.md`, `corruption_report.md`) | Hoàn thành |
| Điều phối luồng giả lập & sửa lỗi | [corruption_flow.py](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/src/pipelines/corruption_flow.py) | Clean data & Raw records | Chạy tích hợp toàn trình và ghi báo cáo so sánh | Hoàn thành |

---

### Việc hỗ trợ ngoài phạm vi chính

| Hoạt động                         | Thành viên/module được hỗ trợ | Kết quả                    |
| ------------------------------------ | ------------------------------------ | ---------------------------- |
| Tích hợp API OpenAI | Ingest/Clean/RAG | Tích hợp cấu hình `LLM_PROVIDER=openai` trong `.env` để tối ưu hóa thời gian chạy LLM Judge trên đám mây thay vì chạy Qwen 3.5 local trên CPU bị nghẽn. |
| Cơ chế Cache cho LLM Judge | Đội ngũ RAG / Evaluation | Thêm tệp cache [judge_cache.json](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/data/results/judge_cache.json) lưu trữ các quyết định chấm điểm để tránh gọi API trùng lặp trong các lượt chạy sau. |

---

## 3. Kết quả theo vai trò

| Nhiệm vụ đã thực hiện | File/hàm/artifact liên quan | Kết quả bàn giao       | Cách xác minh         |
| --------------------------- | ----------------------------- | ------------------------- | ----------------------- |
| Thiết kế bộ kiểm định chất lượng | `quality.py` | `baseline_quality_report.json` và `freshness_report.json` | Chạy `run_phase1.py` kiểm tra file đầu ra |
| Xây dựng và đánh giá RAG | `metrics.py` | `baseline_answers.json` và `baseline_metrics.json` | Kiểm tra độ chính xác (Hit rate: 100%, F1: 1.0) |
| Đánh giá luồng giả lập lỗi dữ liệu | `corruption_flow.py` | `corrupted_answers.json` & `corrupted_metrics.json` | Điểm số Agent sụt giảm mạnh (Hit Rate: 33.3%, F1: 0.46) |
| So sánh kết quả 3 pha | `reporting.py` | [corruption_report.md](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/data/reports/corruption_report.md) | Bảng so sánh 3 pha sạch, bẩn, sửa đầy đủ chỉ số và ví dụ |

Nêu một output cụ thể mà phần việc của bạn tạo ra hoặc giúp xác minh:
Tệp báo cáo so sánh cuối cùng [corruption_report.md](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/data/reports/corruption_report.md) thể hiện một cách khoa học tác động tiêu cực của dữ liệu lỗi lên hệ thống RAG (Hit rate giảm 66.7%, F1 giảm 0.54), đồng thời xác minh sự phục hồi 100% của hệ thống sau khi chạy qua luồng khôi phục dữ liệu từ nguồn raw.

---

## 4. Giải thích phần kỹ thuật đã thực hiện

### Vấn đề cần giải quyết
Hệ thống RAG cần được đánh giá hiệu năng một cách chính xác trước và sau khi dữ liệu bị lỗi. Đồng thời, chất lượng dữ liệu nạp vào phải được tự động giám sát liên tục để phát hiện kịp thời các hiện tượng phình to, trùng lặp bản ghi, thiếu trường quan trọng hoặc dữ liệu bị lỗi thời (stale data).

### Cách triển khai
1.  **Sinh bộ test cố định**: Viết hàm `build_test_set` lấy ra 3 bài báo tiêu biểu từ tập dữ liệu sạch, tạo ra 4 câu hỏi kiểm định cho mỗi bài báo (`summary`, `authors`, `date`, `categories`) dùng các từ khóa kích hoạt như `"Provide a summary"`, `"Who authored"`, `"When was"`, `"What categories"`.
2.  **Đánh giá RAG**: Tính toán Token F1-score so khớp từ vựng giữa câu trả lời sinh ra của Agent và nhãn đúng (Ground Truth). Tích hợp OpenAI API thông qua `gpt-4o-mini` để đánh giá ngữ nghĩa (Semantic Judge), xuất ra điểm số (1-5), tính đúng/sai và lý giải ngắn gọn.
3.  **Giám sát chất lượng dữ liệu (Quality Gates)**: Viết các quy tắc kiểm tra:
    *   Row count: Phải đạt tối thiểu 20 dòng.
    *   Paper ID: Không được null và không được trùng lặp.
    *   Title & Summary: Không được rỗng, độ dài tóm tắt phải $\ge 100$ ký tự.
    *   Freshness: Ngày xuất bản (`published`) phải $\le 180$ ngày so với ngày chạy hệ thống.

### Input, output và contract

| Thành phần                   | Mô tả                                     |
| ------------------------------ | ------------------------------------------- |
| Input                          | Cleaned Dataframe / JSON dataset và Chỉ mục vector ChromaDB. |
| Output                         | Tập câu hỏi kiểm thử `test_set.json`, các JSON báo cáo chất lượng & chỉ số đánh giá, báo cáo so sánh Markdown. |
| Module phụ thuộc             | `src/retrieval/qa.py` (Sinh câu trả lời từ RAG Agent), `src/retrieval/index.py` (Lọc và tìm kiếm vector). |
| Module sử dụng output        | Giao diện Chatbot frontend, Báo cáo kiểm định của QA/Lead. |
| Điều kiện lỗi cần xử lý | Khi API OpenAI bị lỗi (mất mạng hoặc quá hạn mức), hệ thống sẽ tự động dùng hàm heuristic dựa trên Token F1-score để chấm điểm dự phòng nhằm đảm bảo tính ổn định của luồng chạy. |

### Cách xác minh

```bash
uv run python script/run_corruption_flow.py
```

- **Kết quả mong đợi:** Chương trình chạy thành công qua cả 3 pha: nạp dữ liệu sạch baseline, chạy giả lập lỗi, và chạy sửa dữ liệu. Xuất ra tệp báo cáo `corruption_report.md` có đầy đủ các chỉ số khớp với các JSON file thực tế.
- **Kết quả thực tế:** Chương trình chạy hoàn chỉnh, ghi nhận các chỉ số: Baseline (Hit rate 100%, F1 1.0) -> Corrupted (Hit rate 33.3%, F1 0.46) -> Repaired (Hit rate 100%, F1 1.0).
- **Artifact/log:** [corruption_report.md](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/data/reports/corruption_report.md)

---

## 5. Một quyết định kỹ thuật quan trọng

- **Bối cảnh:** Ở lượt chạy thử nghiệm đầu tiên, việc gọi mô hình local `qwen3.5:9b` trên Ollama để chạy làm LLM Judge chấm điểm cho 24 câu hỏi kiểm thử diễn ra vô cùng chậm (mất khoảng 4-5 phút cho mỗi câu hỏi do mô hình sinh ra hàng ngàn token suy nghĩ trên CPU máy trạm).
- **Các phương án đã cân nhắc:**
  * *Phương án 1*: Giảm quy mô bộ test set xuống còn 12 câu hỏi và chuyển sang mô hình local nhỏ hơn là `Gemma2:2b`.
  * *Phương án 2*: Chuyển LLM Judge sang sử dụng đám mây OpenAI thông qua `gpt-4o-mini`, kết hợp cơ chế ghi Cache cục bộ (`judge_cache.json`) cho các phản hồi đã được chấm điểm trước đó.
- **Phương án đã chọn:** Phương án 2.
- **Lý do:** OpenAI `gpt-4o-mini` chạy trên đám mây cực kỳ nhanh (< 1 giây/câu hỏi) và có khả năng hiểu ngữ nghĩa để chấm điểm tốt hơn nhiều so với Gemma 2B. Thêm vào đó, việc kết hợp tệp Cache `judge_cache.json` giúp cho các lần chạy sau (như pha phục hồi dữ liệu repaired) tái sử dụng lại kết quả cũ mà không tốn chi phí gọi API, giảm thời gian chạy toàn bộ pipeline xuống dưới 10 giây.
- **Bằng chứng quyết định phù hợp:** Thời gian chạy toàn luồng giảm từ hàng chục phút xuống dưới 1 phút (ở pha sửa dữ liệu hầu như hoàn thành ngay lập tức nhờ hit cache).

---

## 6. Một lỗi hoặc blocker đã xử lý

- **Triệu chứng/lỗi nguyên văn:**
  Dòng `Total Rows` trong báo cáo so sánh `corruption_report.md` hiển thị giá trị tĩnh cố định là `12 | 12 | 12 | Delta 0` trên cả 3 trạng thái. Điều này làm mất đi bằng chứng trực quan nhất của pha phá hoại dữ liệu (xóa bớt 1 dòng mới nhất và nhân bản 1 dòng cũ).
- **Lệnh hoặc bước tái hiện:**
  Đọc báo cáo tại [corruption_report.md](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/data/reports/corruption_report.md) sau khi chạy `run_corruption_flow.py`.
- **Nguyên nhân gốc:**
  Trong tệp [reporting.py](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/src/observability/reporting.py) tại dòng 192, biến `Total Rows` đang lấy nhầm giá trị từ `metrics.get("samples")` (số câu hỏi kiểm thử cố định là 12) thay vì lấy `quality.get("total_rows")` (số lượng bản ghi thực tế của tập dữ liệu).
- **Cách xử lý:**
  1. Thay đổi chữ ký của hàm `generate_corruption_report` để nhận thêm tham số `baseline_quality`.
  2. Trong [corruption_flow.py](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/src/pipelines/corruption_flow.py), đọc tệp `baseline_quality_report.json` và truyền vào hàm báo cáo.
  3. Cập nhật dòng bảng so sánh trong [reporting.py](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/src/observability/reporting.py):
     `| **Total Rows** | {baseline_quality.get("total_rows", 24)} | {corrupted_quality.get("total_rows", 23)} | {repaired_quality.get("total_rows", 24)} | {(corrupted_quality.get("total_rows", 23) - baseline_quality.get("total_rows", 24))} |`
- **Cách xác minh sau khi sửa:**
  Chạy lại toàn bộ luồng `run_corruption_flow.py`. Tệp báo cáo so sánh hiện tại đã hiển thị đúng số dòng thực tế biến động: `24 | 23 | 24 | -1`.
- **Điều học được:**
  Khi thiết kế hệ thống báo cáo, cần phân biệt rõ ràng giữa các chỉ số kiểm thử (Evaluation Metrics - như số lượng câu hỏi) và các chỉ số vận hành dữ liệu thực tế (Data Quality Signals - như số lượng dòng bản ghi).

---

## 7. Hiểu biết về luồng end-to-end

1.  **Dữ liệu đi từ Crossref đến vector index ra sao?**
    *   Dữ liệu thô ban đầu được gọi từ Crossref API về máy ở dạng JSON thô.
    *   Qua bước Cleaning, dữ liệu được lọc dòng rác, loại bỏ thẻ HTML, chuẩn hóa ngày tháng và gộp các trường mảng thành chuỗi phân tách bởi dấu phẩy, sau đó ghép thành trường văn bản `text_for_embedding`.
    *   Cột `text_for_embedding` được chạy qua mô hình `SentenceTransformer` để chuyển đổi sang không gian vector số thực và thêm vào cơ sở dữ liệu vector ChromaDB để tạo thành các collection chỉ mục (`papers-baseline`).
2.  **Evaluation set và ground-truth document IDs dùng để đo chất lượng tìm kiếm/trả lời như thế nào?**
    *   Bộ câu hỏi kiểm thử chứa các thông tin mong đợi bao gồm câu hỏi (`question`), câu trả lời đúng (`ground_truth`) và mã bài báo chứa thông tin chuẩn (`ground_truth_doc_ids`).
    *   **Retrieval Quality**: Được đo bằng tỷ lệ câu hỏi mà hệ thống tìm thấy đúng tài liệu nguồn (so khớp ID bài báo được tìm thấy với `ground_truth_doc_ids`).
    *   **Answer Quality**: Được đo bằng cách đối chiếu văn bản trả về của Agent với `ground_truth` (thông qua điểm F1 từ vựng và chấm điểm ngữ nghĩa của LLM Judge).
3.  **Quality checks khác freshness monitoring ở điểm nào trong bài lab?**
    *   **Quality checks**: Đo lường tính toàn vẹn kỹ thuật của cấu trúc bảng dữ liệu (thiếu tiêu đề/tóm tắt, trùng lặp khóa chính `paper_id`, tổng số dòng dữ liệu quá thấp).
    *   **Freshness monitoring**: Đo lường tính thời sự của dữ liệu dựa trên khoảng thời gian (`age_days`) so với thời điểm chạy hệ thống, đảm bảo dữ liệu phục vụ RAG không bị cũ và lỗi thời (stale).
4.  **Vì sao phải dùng cùng test set cho baseline, corrupted và repaired?**
    *   Để đảm bảo tính khoa học và tính so sánh được của thí nghiệm. Giữ nguyên bộ câu hỏi kiểm thử cố định là biến độc lập duy nhất, từ đó chúng ta mới đo lường chính xác sự thay đổi hiệu năng của Agent (biến phụ thuộc) khi chất lượng dữ liệu thay đổi.
5.  **Repair được xem là thành công dựa trên artifact và metric nào?**
    *   **Artifact**: Tệp `repaired_quality_report.json` và `repaired_freshness_report.json` đều trả về trạng thái **PASS** và không có lỗi.
    *   **Metric**: Chỉ số `retrieval_hit_rate` quay lại **100%** và `mean_token_f1` đạt **1.0000** (khôi phục hoàn toàn về mức baseline ban đầu).

---

## 8. Phân tích kết quả

### Metrics chính

| Metric/signal          | Baseline | Corrupted | Repaired | Nhận xét của cá nhân |
| ---------------------- | -------: | --------: | -------: | ------------------------- |
| `retrieval_hit_rate` |      1.0 |    0.3333 |      1.0 | Retrieval giảm mạnh khi bị xóa dữ liệu nguồn. |
| `mean_token_f1`      |      1.0 |    0.4600 |      1.0 | Chất lượng trả lời giảm sâu do tóm tắt bị lỗi/nhiễu. |
| `judge_accuracy`     |      1.0 |    0.4167 |      1.0 | GPT-4o-mini đánh giá phần lớn câu trả lời bẩn là sai. |
| `mean_judge_score`   |      5.0 |      3.08 |      5.0 | Điểm chất lượng trung bình giảm mạnh ở pha lỗi. |
| Quality checks         |     PASS |  **FAIL** |     PASS | Phát hiện chính xác lỗi trùng ID và trường rỗng. |
| Freshness status       |    FRESH | **STALE** |    FRESH | Cảnh báo đúng khi ngày xuất bản bị thay đổi làm cũ. |

### Kết luận từ số liệu

1.  **[Data corruption]** $\rightarrow$ Quality check cảnh báo **FAIL**, Freshness báo **STALE**, số lượng bản ghi giảm còn **23** $\rightarrow$ Làm suy sụp chất lượng tìm kiếm của Agent (Hit rate giảm mất **66.7%**) và kéo theo điểm số của LLM Judge giảm mạnh xuống còn **3.08 / 5**.
2.  **[Repair action]** $\rightarrow$ Quality check và Freshness phục hồi về **PASS / FRESH**, số lượng bản ghi khôi phục đủ **24** $\rightarrow$ Các chỉ số của Agent (Hit rate, Token F1, Judge Score) khôi phục hoàn hảo về mức baseline **100%**.

*   **Corruption nào ảnh hưởng rõ nhất và vì sao?**
    Lỗi xóa bản ghi (`drop_latest`) ảnh hưởng rõ rệt nhất. Bởi vì khi tài liệu nguồn bị loại bỏ hoàn toàn khỏi vector index, RAG Agent không thể tìm kiếm hay trích xuất bất kỳ ngữ cảnh nào để trả lời câu hỏi liên quan đến tài liệu đó, gây ra hiện tượng **Retrieval Miss** trực tiếp.
*   **Kết quả nào khác với kỳ vọng ban đầu?**
    Ban đầu, tôi nghĩ việc chèn nhiễu vào tóm tắt (`inject_summary_noise`) chỉ làm giảm nhẹ Token F1 của Agent. Tuy nhiên, kết quả thực tế cho thấy LLM Judge chấm điểm rất khắt khe (chỉ đạt 2/5 hoặc 3/5 điểm) vì nhiễu ký tự lạ làm thay đổi cấu trúc câu khiến LLM Judge đánh giá câu trả lời thiếu tính mạch lạc và không chính xác về ngữ nghĩa.

---

## 9. Điều học được và hướng cải thiện

### Ba điều quan trọng nhất
1.  **Về data pipeline**: Một pipeline RAG hoạt động ổn định phụ thuộc hoàn toàn vào cấu trúc dữ liệu làm sạch ổn định ban đầu (Clean Schema Contract).
2.  **Về data quality/observability**: Phải thiết lập các rào chắn tự động (Quality Gates) ngay tại cổng nạp dữ liệu để phát hiện bất thường sớm, tránh để dữ liệu bẩn lan truyền vào làm hỏng chỉ mục vector.
3.  **Về ảnh hưởng của data đến RAG**: Chất lượng dữ liệu trực tiếp quyết định chất lượng phản hồi của Agent. Khâu khôi phục (Repair) dữ liệu chuẩn xác là cách nhanh nhất để đưa hiệu năng Agent về mức tối đa.

### Nếu có thêm thời gian
Tôi sẽ phát triển thêm tính năng **Auto-Healing** (Tự động sửa lỗi). Thay vì chỉ báo động dữ liệu bị lỗi và chờ kỹ sư chạy khôi phục bằng tay, hệ thống giám sát khi phát hiện Quality Gate bị FAIL sẽ tự động gửi tín hiệu yêu cầu bộ Ingestion nạp lại bản ghi sạch từ snapshot raw để tự phục hồi trực tuyến mà không làm gián đoạn chatbot.

---

## 10. Cam kết của thành viên

Đánh dấu sau khi tự kiểm tra:

- [x] Nội dung báo cáo phản ánh đúng phần việc và mức hiểu của tôi.
- [x] Tôi có thể giải thích luồng end-to-end, không chỉ module mình phụ trách.
- [x] Mọi kết luận về kết quả đều có artifact hoặc metric để đối chiếu.
- [x] Tôi không ghi “đã chạy thành công” cho phần chưa được kiểm chứng.
- [x] Báo cáo không chứa `.env`, API key, token hoặc secret.
- [x] Báo cáo này không phải bản sao nguyên văn của báo cáo nhóm hoặc báo cáo thành viên khác.

**Họ và tên:** Hà Anh Tuấn
**Ngày xác nhận:** 2026-08-06
