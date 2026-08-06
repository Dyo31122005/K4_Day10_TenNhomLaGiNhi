# Báo cáo kiểm tra dữ liệu corrupted

Được tạo từ `data/clean/papers_clean.json`,
`data/clean/papers_clean_corrupted.json` và
`data/results/corruption_log.json` vào ngày 2026-08-06.

## Kết quả: ĐẠT, kèm các giới hạn quan sát đã được nêu rõ

Artifact corrupted nhất quán với corruption log:
`verification.is_consistent` là `true` và toàn bộ 11 kiểm tra theo từng
operation đều đạt.

| Hạng mục kiểm tra | Kết quả |
| --- | --- |
| Số dòng baseline / corrupted | 24 / 25 |
| Schema khớp baseline và clean contract | ĐẠT (16 cột, cùng thứ tự) |
| Số operation được log | 11 |
| Record baseline bị thiếu | 1 (`10.1111/exsy.70341`) |
| ID near-duplicate mới | `10.1007/s10278-026-02086-9#near-duplicate` |
| `paper_id` bị trùng | `10.2118/234689-pa` |

Chênh lệch số dòng là +1 đúng với log hiện tại: `drop_latest` xóa một dòng,
sau đó `duplicate_row` và `semantic_near_duplicate` mỗi operation thêm một
dòng.

## Bằng chứng cho các lỗi bắt buộc

| Lỗi bắt buộc | Record ID | Bằng chứng | Trạng thái |
| --- | --- | --- | --- |
| Duplicate | `10.1007/s10278-026-02086-9` | Xuất hiện hai lần; kiểm tra `paper_id_unique` ghi nhận một ID trùng. | ĐẠT |
| Missing summary | `10.1007/s10278-026-02086-9` | `summary` rỗng; do bản duplicate cũng được giữ lại nên có hai summary ngắn hơn 100 ký tự. | ĐẠT |
| Stale date | `10.3390/buildings16132637` | `published` bị lùi 730 ngày và `age_days` tăng tương ứng 730. | ĐẠT |
| Title bị cắt | `10.2196/preprints.106157` | Title dài không quá 24 ký tự; chỉ có một title có độ dài <= 24. | ĐẠT |

## Kết quả quality và freshness

`data/quality/corrupted_quality_report.json` báo `is_valid: false`, đúng như
mục tiêu mô phỏng lỗi:

| Kiểm tra | Kết quả | Bằng chứng |
| --- | --- | --- |
| Số dòng >= 20 | PASS | 25 dòng |
| `paper_id` không rỗng | PASS | 0 ID rỗng |
| `paper_id` duy nhất | FAIL | 1 ID trùng |
| Title không rỗng | PASS | 0 title rỗng |
| Summary >= 100 ký tự | FAIL | 2 summary ngắn |
| Ngưỡng freshness (180 ngày) | FAIL | 1 dòng stale |

`data/quality/corrupted_freshness_report.json` báo `is_fresh: false`, với một
dòng stale. Report cũng thể hiện ngày xuất bản lớn nhất là `2027-06-01`, do
operation `make_published_future` tạo ra.

## Tác động đến retrieval và agent evaluation

Các corruption sau có thể ảnh hưởng retrieval hoặc chất lượng câu trả lời dù
vẫn giữ dataframe ở dạng hợp lệ: xóa record mới nhất, summary rỗng/nhiễu,
title bị cắt, hoán đổi category hoặc tác giả, HTML markup, ngày stale/tương
lai, duplicate và semantic near-duplicate. Chúng có thể làm mất document mục
tiêu, làm loãng thứ hạng tương đồng, trả về metadata sai hoặc cung cấp evidence
không đúng cho agent.

Frozen C2 hiện có 12 câu hỏi trên 3 `paper_id` khác nhau. Tất cả 11 operation
đều có ít nhất một `frozen_test_overlap_record_ids` trong corruption log;
`frozen_test_set.all_operations_overlap` là `true`. Vì vậy các lỗi đã đụng trực
tiếp tài liệu được hỏi bởi C2 và có thể tạo thay đổi đo được ở retrieval/agent
evaluation. Kết quả evaluation hiện tại trên corrupted index là retrieval hit
rate 66.7%, token F1 0.3495, judge accuracy 33.3% và mean judge score 2.50;
repaired phục hồi về baseline 100%, 1.0000, 100% và 5.00.

## Giới hạn phát hiện lỗi

Các quality/freshness check tiêu chuẩn đã phát hiện đúng duplicate, missing
summary và stale date. Chúng chưa tự phát hiện title bị cắt, summary noise,
HTML leakage, future date, hoán đổi category/tác giả, record bị xóa hoặc
semantic near-duplicate. Điều này phù hợp với bản chất của các kiểm tra định
dạng: một số corruption được cố ý thiết kế là lỗi ngữ nghĩa âm thầm.
Operation-level verification trong corruption log phát hiện đủ 11 thay đổi đã
inject; muốn tự phát hiện các lỗi còn lại mà không cần log thì cần bổ sung rule
quality nâng cao hoặc cơ chế đối soát có baseline.
