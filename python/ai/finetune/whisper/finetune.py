# 全量监督训练

from huggingface_hub import login
from datasets import load_dataset, DatasetDict, concatenate_datasets, Audio
from transformers import WhisperFeatureExtractor,WhisperTokenizer,WhisperProcessor
import torch
from dataclasses import dataclass
from typing import Any, Dict, List, Union
import os

import evaluate
from transformers import WhisperForConditionalGeneration
from transformers import Seq2SeqTrainingArguments
from transformers import Seq2SeqTrainer
from config import BasicConfig
import random  

from prepare_dataset_setup1 import Run
from prepare_dataset_setup2 import loadFormDisk, loadFormDisk2

numbers = list(range(1000))
# 从这个列表中随机选择100个不重复的数  
random_numbers = random.sample(numbers, 100)
# print(len(set(random_numbers)) == len(random_numbers))

# disk

common_voice = loadFormDisk2()
# common_voice = common_voice.load_from_disk(BasicConfig.get("full_datasets_disk_path"))
# common_voice = Run()

# common_voice['train'] = common_voice['train'].select(random_numbers)
# common_voice['test'] = common_voice['test'].select(random_numbers)

print(common_voice,"common_voice")
modelPath = BasicConfig.get("model_path")
feature_extractor = WhisperFeatureExtractor.from_pretrained(modelPath)
tokenizer = WhisperTokenizer.from_pretrained(modelPath, language="zh", task="transcribe")

processor = WhisperProcessor.from_pretrained(modelPath, language="zh", task="transcribe")

@dataclass
class DataCollatorSpeechSeq2SeqWithPadding:
    processor: Any

    def __call__(self, features: List[Dict[str, Union[List[int], torch.Tensor]]]) -> Dict[str, torch.Tensor]:
        # split inputs and labels since they have to be of different lengths and need different padding methods
        # first treat the audio inputs by simply returning torch tensors
        input_features = [{"input_features": feature["input_features"]} for feature in features]
        batch = self.processor.feature_extractor.pad(input_features, return_tensors="pt")

        # get the tokenized label sequences
        label_features = [{"input_ids": feature["labels"]} for feature in features]
        # pad the labels to max length
        labels_batch = self.processor.tokenizer.pad(label_features, return_tensors="pt")

        # replace padding with -100 to ignore loss correctly
        labels = labels_batch["input_ids"].masked_fill(labels_batch.attention_mask.ne(1), -100)

        # if bos token is appended in previous tokenization step,
        # cut bos token here as it's append later anyways
        if (labels[:, 0] == self.processor.tokenizer.bos_token_id).all().cpu().item():
            labels = labels[:, 1:]

        batch["labels"] = labels

        return batch

data_collator = DataCollatorSpeechSeq2SeqWithPadding(processor=processor)
metric = evaluate.load("wer")




def compute_metrics(pred):
    pred_ids = pred.predictions
    label_ids = pred.label_ids

    # replace -100 with the pad_token_id
    label_ids[label_ids == -100] = tokenizer.pad_token_id

    # we do not want to group tokens when computing the metrics
    pred_str = tokenizer.batch_decode(pred_ids, skip_special_tokens=True)
    label_str = tokenizer.batch_decode(label_ids, skip_special_tokens=True)

    wer = 100 * metric.compute(predictions=pred_str, references=label_str)

    return {"wer": wer}


model = WhisperForConditionalGeneration.from_pretrained(modelPath)
print(model.model.encoder.conv1)

model.config.forced_decoder_ids = None
model.config.suppress_tokens = []
model.config.language = "zh"
model.config.task = "transcribe"
# {'client_id': 'f2f5399cfb9d54f69237432a011d00dad20a6b22718a2f696b9bb22dc2e0c6ed1400818af67f34f8142d56bb49c57ceebb98a8bedaffc4ea3e499ec397f45436', 'path': 'common_voice_zh-HK_20099799.mp3', 'sentence': '嗰次喺灣仔博覽道東見到有雞蛋仔格仔餅賣', 'up_votes': 0, 'down_votes': 2, 'age': 'thirties', 'gender': 'male', 'accents': None, 'locale': 'zh-HK', 'segment': None}


# training_args = Seq2SeqTrainingArguments(
#     output_dir="./finetune/whisper-medVocSmall", # change to a repo name of your choice
#     per_device_train_batch_size=18,
#     gradient_accumulation_steps=2, # increase by 2x for every 2x decrease in batch size
#     learning_rate=3e-5,
#     warmup_steps=1000,
#     max_steps=5000,
#     gradient_checkpointing=True,
#     fp16=True,
#     eval_strategy="steps",
#     per_device_eval_batch_size=8,
#     predict_with_generate=True,
#     generation_max_length=300,
#     save_steps=1500,
#     eval_steps=750,
#     logging_steps=25,
#     report_to=["tensorboard"],
#     load_best_model_at_end=True,
#     metric_for_best_model="wer",
#     greater_is_better=False,
#     push_to_hub=False,
# )
training_args = Seq2SeqTrainingArguments(
    output_dir=BasicConfig["output_dir"]+ "-check", # change to a repo name of your choice
    per_device_train_batch_size=BasicConfig.get("per_device_train_batch_size"),
    gradient_accumulation_steps=BasicConfig.get("gradient_accumulation_steps"), # increase by 2x for every 2x decrease in batch size
    learning_rate=BasicConfig.get("learning_rate"),
    warmup_steps=BasicConfig["warmup_steps"],
    max_steps=BasicConfig["max_steps"],
    gradient_checkpointing=True,
    fp16=True,
    eval_strategy="steps",
    per_device_eval_batch_size=BasicConfig["per_device_eval_batch_size"],
    predict_with_generate=True,
    generation_max_length=300,
    save_steps=BasicConfig["save_steps"],
    eval_steps=BasicConfig["eval_steps"],
    logging_steps=500,
    report_to=["tensorboard"],
    load_best_model_at_end=True,
    metric_for_best_model="wer",
    greater_is_better=False,
    push_to_hub=False,
)


trainer = Seq2SeqTrainer(
    args=training_args,
    model=model,
    train_dataset=common_voice["train"],
    eval_dataset=common_voice["test"],
    data_collator=data_collator,
    compute_metrics=compute_metrics,
    tokenizer=processor.feature_extractor,
)

trainer.train()

trainer.save_state()
# trainer.save_model("./temp/model")

model.save_pretrained(BasicConfig["output_dir"])
tokenizer.save_pretrained(BasicConfig["output_dir"])
processor.save_pretrained(BasicConfig["output_dir"])
