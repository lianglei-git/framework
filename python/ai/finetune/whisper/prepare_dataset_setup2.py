"""
be not recommended for use
"""
# # from huggingface_hub import login
# from datasets import load_dataset, DatasetDict, concatenate_datasets, Audio
# import os
# from transformers import WhisperFeatureExtractor,WhisperTokenizer,WhisperProcessor
# import torch
# import librosa
# from dataclasses import dataclass
# from typing import Any, Dict, List, Union

# # huggingface-cli download --resume-download lj1995/VoiceConversionWebUI/uvr5_weights --local-dir ./lj1995/VoiceConversionWebUI
# # os.environ['HF_ENDPOINT']='https://hf-mirror.com'
# # export HF_ENDPOINT='https://hf-mirror.com'




from datasets import load_dataset, DatasetDict,concatenate_datasets
import random

numbers = list(range(8000))
# datas = [
#     "/home/apple/Zayne/fine-turning-whisper-turbo/dev/res-datasets/whisper-large-v3-turbo-common-voice-0",
#     "/home/apple/Zayne/fine-turning-whisper-turbo/dev/res-datasets/whisper-large-v3-turbo-common-voice-1",
#     "/home/apple/Zayne/fine-turning-whisper-turbo/dev/res-datasets/whisper-large-v3-turbo-common-voice-2",
#     "/home/apple/Zayne/fine-turning-whisper-turbo/dev/res-datasets/whisper-large-v3-turbo-common-voice-3",
#     "/home/apple/Zayne/fine-turning-whisper-turbo/dev/res-datasets/whisper-large-v3-turbo-common-voice-4",
#     "/home/apple/Zayne/fine-turning-whisper-turbo/dev/res-datasets/whisper-large-v3-turbo-medvoc",
#     "/home/apple/Zayne/fine-turning-whisper-turbo/dev/res-datasets/whisper-large-v3-turbo-part-甲乳腹-0",
# ]

datasetsPaths = [
    {
        "path": ["/home/apple/Zayne/fine-turning-whisper-turbo/dev/res-datasets/whisper-large-v3-turbo-part-甲乳腹-0/"],
        "requires": {
            "train_total_duration": 5 * 60 * 60,
            "test_total_duration": 1.2 * 60 * 60,
            "train_ran": range(0,3407),
            "test_ran": range(0,700),
        }
    },
     {
        "path": ["/home/apple/Zayne/fine-turning-whisper-turbo/dev/res-datasets/whisper-large-v3-turbo-part-肝-0/"],
        "requires": {
            "train_total_duration": 5 * 60 * 60,
            "test_total_duration": 1.2 * 60 * 60,
            "train_ran": range(0,970),
            "test_ran": range(0,348),
        }
    },
        {
        "path": ["/home/apple/Zayne/fine-turning-whisper-turbo/dev/res-datasets/whisper-large-v3-turbo-part-甲乳腹-0/"],
        "requires": {
            "train_total_duration": 5 * 60 * 60,
            "test_total_duration": 1.2 * 60 * 60,
            "train_ran": range(0,1407),
            "test_ran": range(0,200),
        }
    },
    {
        "path": ["/home/apple/Zayne/fine-turning-whisper-turbo/dev/res-datasets/whisper-large-v3-turbo-medvoc/"],
        "requires": {
            "train_total_duration": 4 * 60 * 60,
            "test_total_duration": 1.2 * 60 * 60,
            "train_ran": range(0,4000),
            "test_ran": range(0,1000),
        }
    },
    {
        "path": ["/home/apple/Zayne/fine-turning-whisper-turbo/dev/res-datasets/whisper-large-v3-turbo-aishell-0/",
            "/home/apple/Zayne/fine-turning-whisper-turbo/dev/res-datasets/whisper-large-v3-turbo-aishell-1/",
          "/home/apple/Zayne/fine-turning-whisper-turbo/dev/res-datasets/whisper-large-v3-turbo-aishell-2/",
          "/home/apple/Zayne/fine-turning-whisper-turbo/dev/res-datasets/whisper-large-v3-turbo-aishell-3/"],
        "requires": {
            "train_total_duration": 26 * 60 * 60,
            "test_total_duration": 6 * 60 * 60,
            "train_ran": range(0,8000),
            "test_ran": range(0,2000),
        }
    }
]


def getDurationFromDataset(batch):
    return len(batch["audio"]["array"]) / batch["audio"]["sampling_rate"]


def filter_by_duration(dataset, target_duration, get_duration_func):
    """
    从数据集中筛选出总时长接近目标时长的数据
    
    参数:
        dataset: 输入的数据集
        target_duration: 目标总时长（秒）
        get_duration_func: 用于获取单个样本时长的函数
    
    返回:
        筛选后的数据集
    """
    current_duration = 0
    selected_indices = []
    
    for i, example in enumerate(dataset):
        # 获取当前样本的时长
        duration = get_duration_func(example)
        
        # 如果加入当前样本后总时长不超过目标时长，则选择该样本
        if current_duration + duration <= target_duration:
            selected_indices.append(i)
            current_duration += duration
            print(current_duration,target_duration)
        else:
            # 已达到或超过目标时长，停止筛选
            break
    
    # 根据索引创建筛选后的数据集
    return dataset.select(selected_indices)



def loadFormDisk():
    common_voice1 = DatasetDict().load_from_disk("./res-datasets/whisper-large-v3-turbo-aishell-2")
    common_voice2 = DatasetDict().load_from_disk("./res-datasets/whisper-large-v3-turbo-aishell-3")
    common_voice3 = DatasetDict().load_from_disk("./res-datasets/whisper-large-v3-turbo-medvoc")

    # common_voice1 = common_voice1.remove_columns(["down_votes"])
    # common_voice2 = common_voice2.remove_columns(["down_votes"])


    # common_voice2['train'] = common_voice2['train'].select(range(0,3000))
    # common_voice3['train'] = common_voice3['train'].select(range(0,6000))

    # common_voice1['test'] = common_voice1['test'].select(range(0,2400))
    # common_voice2['test'] = common_voice2['test'].select(range(0,2400))
    # common_voice3['test'] = common_voice3['test'].select(range(0,1200))


    trainD = concatenate_datasets([common_voice1['train'], common_voice2['train'], common_voice3['train']]).shuffle(seed=42)
    testD = concatenate_datasets([common_voice1['test'],common_voice2['test'],common_voice3['test']]).shuffle(seed=42)

    print("数据总量:  训练集: ", len(trainD), " 测试集: ", len(testD))

    common_voice = DatasetDict({
        'train': trainD,
        'test':testD
    })
    # common_voice = common_voice.select_columns(["audio", "sentence"])
    return common_voice





def loadFormDisk2():
    trl = []
    tel = []
    for item in datasetsPaths:
        itemTrains = []
        itemTests = []
        for item_path in item["path"]:
            d = DatasetDict().load_from_disk(item_path)
            itemTrains.append(d["train"])
            itemTests.append(d["test"])
        
        _trainD = concatenate_datasets(itemTrains).shuffle(seed=42).select(item["requires"]["train_ran"])
        _testD = concatenate_datasets(itemTests).shuffle(seed=42).select(item["requires"]["test_ran"])
        trl.append(_trainD)
        tel.append(_testD)



    trainD = concatenate_datasets(trl).shuffle(seed=42)
    testD = concatenate_datasets(tel).shuffle(seed=42)

    print("数据总量:  训练集: ", len(trainD), " 测试集: ", len(testD))

    common_voice = DatasetDict({
        'train': trainD,
        'test':testD
    })
    return common_voice

