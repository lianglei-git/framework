import warnings
warnings.simplefilter(action='ignore', category=FutureWarning)
warnings.simplefilter(action='ignore', category=UserWarning)

import torch
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline

from evaluate import load
import random
import numpy as np
from datasets import DatasetDict,concatenate_datasets

# # import opencc
# # t2s = opencc.OpenCC("t2s.json")


device = "cuda:0" if torch.cuda.is_available() else "cpu"
torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32


model_id_finetuned = "/home/apple/Zayne/openai/whisper-base"
model_id_origin = "/home/apple/Zayne/openai/whisper-large-v3"




# from transformers import pipeline
# import gradio as gr

# pipe = pipeline(model=model_id) # change to "your-username/the-name-you-picked"

# def transcribe(audio):
#     text = pipe(audio)["text"]
#     return text

# iface = gr.Interface(
#     fn=transcribe,
#     inputs=gr.Audio(source="microphone", type="filepath"),
#     outputs="text",
#     title="Whisper Small Hindi",
#     description="Realtime demo for Hindi speech recognition using a fine-tuned Whisper small model.",
# )

# iface.launch()








def init_model(model_path):
    model = AutoModelForSpeechSeq2Seq.from_pretrained(
        model_path, torch_dtype=torch_dtype, low_cpu_mem_usage=True, use_safetensors=True
    )
    model.to(device)

    processor = AutoProcessor.from_pretrained(model_path)

    pipe = pipeline(
        "automatic-speech-recognition",
        model=model,
        tokenizer=processor.tokenizer,
        feature_extractor=processor.feature_extractor,
        torch_dtype=torch_dtype,
        max_new_tokens=128,
        device=device,
    )
    return pipe

finetune_pipe = init_model(model_id_finetuned)
origin_pipe = init_model(model_id_origin)



common_voice1 = DatasetDict().load_from_disk("../res-datasets/medvoc")
common_voice2 = DatasetDict().load_from_disk("../res-datasets/basic")

numbers = list(range(1800))

common_voice1['test'] = common_voice1['test'].select(random.sample(numbers, 10))
common_voice2['test'] = common_voice2['test'].select(random.sample(numbers, 10))

testD = concatenate_datasets([common_voice1['test'], common_voice2['test']])




all_predictions = []


for i in range(0, len(testD)):
    nparray = np.array(testD[i]["audio"]["array"])
    finetune_prediction = finetune_pipe(
        nparray,
        max_new_tokens=128,
        generate_kwargs={"task": "transcribe", "language": "zh"},
        batch_size=16,
    )
    origin_prediciotn = origin_pipe(
        nparray,
        max_new_tokens=128,
        generate_kwargs={"task": "transcribe", "language": "zh"},
        batch_size=16,
    )
    all_predictions.append(finetune_prediction["text"])
    print("origin:     ", origin_prediciotn["text"])
    print("\033[36m参考文本:   "+testD[i]["sentence"] +"\033[0m")
    print("finetuned:  ",finetune_prediction["text"])
    print("\n---------------------- 分割线 ----------------------------\n")



# 4.0 对预测结果进行评测
from evaluate import load
wer_metric = load("wer")
wer_ortho = 100 * wer_metric.compute(
    references=testD["sentence"], predictions=all_predictions
)
print("直接计算wer指标：",wer_ortho)

# 5.1 计算归一化之后的指标
from transformers.models.whisper.english_normalizer import BasicTextNormalizer
normalizer = BasicTextNormalizer()
# 计算规范化 WER
all_predictions_norm = [normalizer(pred) for pred in all_predictions]
all_references_norm = [normalizer(label) for label in testD["sentence"]]

# 过滤掉参考文本被规范化后为零值的样本
all_predictions_norm = [
    all_predictions_norm[i]
    for i in range(len(all_predictions_norm))
    if len(all_references_norm[i]) > 0
]
all_references_norm = [
    all_references_norm[i]
    for i in range(len(all_references_norm))
    if len(all_references_norm[i]) > 0
]

wer = 100 * wer_metric.compute(
    references=all_references_norm, predictions=all_predictions_norm
)

print("归一化之后计算wer指标：",wer)
