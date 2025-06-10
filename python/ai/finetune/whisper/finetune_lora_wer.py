import gc
import torch
import numpy as np
import evaluate
from tqdm import tqdm
from datasets import DatasetDict
from torch.utils.data import DataLoader
from transformers import WhisperTokenizer, WhisperProcessor, AutoModelForSpeechSeq2Seq
from prepare_dataset_setup2 import loadFormDisk,loadFormDisk2


from config import BasicConfig
from uutils import DataCollatorSpeechSeq2SeqWithPadding




# 指标计算函数
def metricCompute(
        model,
        tokenizer,
        common_voice,
        data_collator,
):
    # 加载wer
    print("=" * 45, " wer ", "="*45)
    metric = evaluate.load("./wer/wer.py")
    eval_dataloader = DataLoader(common_voice["test"], batch_size=8, collate_fn=data_collator)
    model.eval()
    for step, batch in enumerate(tqdm(eval_dataloader)):
        with torch.cuda.amp.autocast():
            with torch.no_grad():
                generated_tokens = (
                    model.generate(
                        input_features=batch["input_features"].to("cuda"),
                        decoder_input_ids=batch["labels"][:, :4].to("cuda"),
                        max_new_tokens=255,
                    )
                    .cpu()
                    .numpy()
                )
                labels = batch["labels"].cpu().numpy()
                labels = np.where(labels != -100, labels, tokenizer.pad_token_id)
                decoded_preds = tokenizer.batch_decode(generated_tokens, skip_special_tokens=True)
                decoded_labels = tokenizer.batch_decode(labels, skip_special_tokens=True)
                metric.add_batch(
                    predictions=decoded_preds,
                    references=decoded_labels,
                )
        del generated_tokens, labels, batch
        gc.collect()
    wer = 100 * metric.compute()
    print(f"{wer=}")


def _main():
    # ----- Config 
    # model_name_or_path = BasicConfig["model_path"]
    model_name_or_path = "../Zayne/fine-turning-whisper-turbo/dev/models/whisper-large-v3-turbo-finetune-0603"


    tokenizer = WhisperTokenizer.from_pretrained(model_name_or_path, language="zh", task="transcribe")
    processor = WhisperProcessor.from_pretrained(model_name_or_path,
                                                    language="zh",
                                                    task="transcribe",
                                                    no_timestamps=not BasicConfig["timestamps"],
                                                    local_files_only=BasicConfig["local_files_only"])
    common_voice = loadFormDisk2()
    data_collator = DataCollatorSpeechSeq2SeqWithPadding(processor=processor)
    model = AutoModelForSpeechSeq2Seq.from_pretrained(model_name_or_path, load_in_8bit=True, device_map="auto", local_files_only=BasicConfig["local_files_only"])
    metricCompute(model, tokenizer, common_voice,data_collator)

if __name__ == "__main__":
    _main()

# ### 结果
# # 2025/4/16 300条数据微调🧪
# # wer=94.82758620689656

# whisper-large-v3-turbo-finetune-0528
# wer=46.92549371633753

# whisper-large-v3-turbo
# wer=86.66965888689407

# whisper-large-v3-turbo-finetune-0516
# wer=48.94524236983842

# whisper-large-v3-turbo-finetune-0515
# wer=56.93447037701975

# whisper-large-v3-turbo-finetune-0603
# wer=48.22843822843823