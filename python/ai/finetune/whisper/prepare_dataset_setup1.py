from datasets import load_dataset, DatasetDict, concatenate_datasets,Audio

from transformers import WhisperFeatureExtractor,WhisperTokenizer,WhisperProcessor
import loadAudio
from config import BasicConfig
import random
import math



def loadFormDisk(path):
    common_voice = DatasetDict()
    common_voice = common_voice.load_from_disk(path)
    return common_voice





def prepare_dataset2(batch):
    audio = batch["audio"]
    audio["sampling_rate"]=16000

    # compute log-Mel input features from input audio array
    batch["input_features"] = feature_extractor(audio["array"], sampling_rate=audio["sampling_rate"]).input_features[0]
    # encode target text to label ids
    batch["labels"] = tokenizer(batch["sentence"]).input_ids
    return batch



def slicing(totalLength, curEpoch = 0, slicingPercent = 20):
    epoch = math.ceil(100 / slicingPercent)
    curE = curEpoch
    is_end = (curE + 1) >= epoch
    start = curE * slicingPercent / 100
    end = totalLength if is_end else int(((curE + 1) * slicingPercent / 100) * totalLength)
    rang = range(int(start * totalLength), end)
    return rang,is_end


# 使用 csv 的方式生成数据集并保存 到disk

def generate_datasets_csv(basicSaveDiskPath):
    slicingPercent = 100
    def prepare_dataset1(batch):
        batch["audio"] = loadAudio.loadAudio(batch["path"])
        return batch

    def recursion(curEpoch):
        saveP = basicSaveDiskPath+"-"+str(curEpoch)
        common_voice = DatasetDict()
        common_voice["train"] = load_dataset("csv",data_files=BasicConfig["preprocess_datasets"]["trainD"] ,sep='\t').get("train")
        common_voice["test"] = load_dataset("csv",data_files=BasicConfig["preprocess_datasets"]["testD"] , sep='\t').get("train")
        range_train, isEnd = slicing(len(common_voice["train"]), curEpoch, slicingPercent)
        range_test,_ = slicing(len(common_voice["test"]), curEpoch, slicingPercent)

        print("range_train: ", range_train, "range_test: ", range_test)
        print("total_train: ", len(common_voice["train"]), "total_test: ", len(common_voice["test"]))
        common_voice["train"] = common_voice["train"].select(range_train).shuffle(seed=42)
        common_voice["test"] = common_voice["test"].select(range_test).shuffle(seed=42)

        common_voice = common_voice.remove_columns([
            "accents", "age", "client_id","down_votes", "gender", "locale", "segment", "up_votes"
        ])
        common_voice = common_voice.map(prepare_dataset1,num_proc=16)
        common_voice = common_voice.map(prepare_dataset2, num_proc=16)

        print("保存数据集到:", saveP)
        common_voice.save_to_disk(saveP)
        common_voice = None
        
        if isEnd:
            print("完成")
            return
        recursion(curEpoch+1)
    recursion(0)
    # common_voice['train'] = common_voice['train'].select(random.sample(list(range(100)), 10))
    # common_voice['test'] = common_voice['test'].select(random.sample(list(range(100)), 5))




# 使用 load的方式生成数据集并保存 到disk
def generate_datasets_load(basicSaveDiskPath):
    max_input_length = 30.0
    slicingPercent = 20

    def prepare_dataset1(batch):
        batch["audio"] = loadAudio.loadAudio(batch["path"])
        batch["down_votes"] = len(batch["audio"]["array"]) / batch["audio"]["sampling_rate"]
        return batch
    
    def is_audio_in_length_range(length):
        return length < max_input_length or length > 3.0
    def recursion(curEpoch):
        saveP = basicSaveDiskPath+"-"+str(curEpoch)
        common_voice = DatasetDict()
        common_voice["train"] = load_dataset(
            "mozilla-foundation/common_voice_13_0", "zh-CN", split="train+validation",trust_remote_code=True
        )
        common_voice["test"] = load_dataset(
            "mozilla-foundation/common_voice_13_0", "zh-CN", split="test",trust_remote_code=True
        )

        range_train, isEnd = slicing(len(common_voice["train"]), curEpoch, slicingPercent)
        range_test,_ = slicing(len(common_voice["test"]), curEpoch, slicingPercent)

        print("range_train: ", range_train, "range_test: ", range_test)
        print("total_train: ", len(common_voice["train"]), "total_test: ", len(common_voice["test"]))
        common_voice["train"] = common_voice["train"].select(range_train)
        common_voice["test"] = common_voice["test"].select(range_test)
        common_voice = common_voice.remove_columns([
            "accent", "age", "client_id", "gender", "locale", "segment", "up_votes", "variant"
        ])
        # common_voice = common_voice.cast_column("audio", Audio(sampling_rate=16000))
        common_voice = common_voice.remove_columns(["audio"])
        common_voice = common_voice.map(prepare_dataset1,num_proc=16)
        common_voice["train"] = common_voice["train"].filter(
            is_audio_in_length_range,
            input_columns=["down_votes"],
        )
        common_voice = common_voice.map(prepare_dataset2, num_proc=16)
        print("保存数据集到:", saveP)
        common_voice.save_to_disk(saveP)
        common_voice = None
        if isEnd:
            print("完成")
            return
        recursion(curEpoch+1)
    recursion(0)

modelPath = BasicConfig["model_path"]
feature_extractor = WhisperFeatureExtractor.from_pretrained(modelPath)
tokenizer = WhisperTokenizer.from_pretrained(modelPath, language="zh", task="transcribe")





def check(func):
    global common_voice
    func()
    input_str = common_voice["train"][0]["sentence"]
    labels = tokenizer(input_str).input_ids
    decoded_with_special = tokenizer.decode(labels, skip_special_tokens=False)
    decoded_str = tokenizer.decode(labels, skip_special_tokens=True)
    print(f"Input: {input_str}")
    print(f"Decoded w/ special: {decoded_with_special}")
    print(f"Decoded w/out special: {decoded_str}")
    print(f"Are equal: {input_str == decoded_str}")
    print(common_voice["train"].features)

    common_voice = common_voice.map(prepare_dataset2, num_proc=16)


def Run():
    generate_datasets_csv("./res-datasets/whisper-large-v3-turbo-part-肝")
    # generate_datasets_load("./res-datasets/whisper-large-v3-turbo-common-voice")




if __name__ == "__main__":
    Run()
 