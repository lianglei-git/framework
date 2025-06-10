from peft import prepare_model_for_kbit_training
from peft import LoraConfig, PeftModel, LoraModel, LoraConfig, get_peft_model
from transformers import TrainerCallback, WhisperProcessor, AutoModelForSpeechSeq2Seq,Seq2SeqTrainer, WhisperForConditionalGeneration, Seq2SeqTrainingArguments
from datasets import load_dataset, DatasetDict, concatenate_datasets, Audio

from uutils import DataCollatorSpeechSeq2SeqWithPadding, SavePeftModelCallback
from config import BasicConfig
from prepare_dataset_setup2 import loadFormDisk,loadFormDisk2

import os



# ------------------  全局参数管理 ---------------
model_name_or_path = BasicConfig["model_path"]
target_modules = ["k_proj", "q_proj", "v_proj", "out_proj", "fc1", "fc2"]
output_dir = BasicConfig["output_dir"]


# ------------------  加载数据 ---------------
# 因为数据都放在其他步骤里面自动生成了，所以这边就直接夹在了

common_voice = loadFormDisk2()
# common_voice = common_voice.load_from_disk(BasicConfig["full_datasets_disk_path"])
# common_voice = Run()


# ------------------  数据处理器 ---------------
processor = WhisperProcessor.from_pretrained(model_name_or_path,
                                                 language="zh",
                                                 task="transcribe",
                                                 no_timestamps=not BasicConfig["timestamps"],
                                                 local_files_only=BasicConfig["local_files_only"])
data_collator = DataCollatorSpeechSeq2SeqWithPadding(processor=processor)


# 加载模型
# model = AutoModelForSpeechSeq2Seq.from_pretrained(model_name_or_path, load_in_8bit=True, device_map="auto")
# 使用专精whisper加载
model = WhisperForConditionalGeneration.from_pretrained(model_name_or_path, load_in_8bit=True, device_map="auto", local_files_only=BasicConfig["local_files_only"])

model.config.forced_decoder_ids = None
model.config.suppress_tokens = []

# lora 构建
print('加载LoRA模块...')

# 模型中部分参数转换为int8训练
model = prepare_model_for_kbit_training(model)

# TODO： 恢复训练的

# 设置lora参数
config = LoraConfig(r=32, lora_alpha=64, target_modules=target_modules, lora_dropout=0.05, bias="none")

# 根据lora参数和基础模型来构建lora模型
model = get_peft_model(model, config)

# 打印训练参数
model.print_trainable_parameters()


# 输出路径
if model_name_or_path.endswith("/"):
    model_name_or_path = model_name_or_path[:-1]
output_dir = os.path.join(output_dir, os.path.basename(model_name_or_path))


training_args = \
    Seq2SeqTrainingArguments(output_dir=output_dir,  # 保存检查点和意志的目录
                            per_device_train_batch_size=BasicConfig["per_device_train_batch_size"],  # 训练batch_size大小
                            per_device_eval_batch_size=BasicConfig["per_device_eval_batch_size"],  # 评估batch_size大小
                            gradient_accumulation_steps=BasicConfig["gradient_accumulation_steps"],  # 训练梯度累计步数
                            learning_rate=BasicConfig["learning_rate"],  # 学习率大小
                            warmup_steps=BasicConfig["warmup_steps"],  # 预热步数
                            num_train_epochs=BasicConfig["num_train_epochs"],  # 微调训练轮数
                            # save_strategy="steps",  # 指定按照步数保存检查点
                            eval_strategy="steps",
                            # evaluation_strategy="steps",  # 指定按照步数评估模型
                            load_best_model_at_end=True,  # 指定是否在结束时加载最优模型
                            fp16=BasicConfig["fp16"],  # 是否使用半精度训练
                            report_to=["tensorboard"],  # 指定使用tensorboard保存log
                            save_steps=BasicConfig["save_steps"],  # 指定保存检查点的步数
                            eval_steps=BasicConfig["eval_steps"],  # 指定评估模型的步数
                            torch_compile=BasicConfig["use_compile"],  # 使用Pytorch2.0的编译器
                            save_total_limit=BasicConfig["save_total_limit"],  # 只保存最新检查点的数量
                            optim='adamw_torch',  # 指定优化方法
                            # ddp_find_unused_parameters=False if ddp else None,  # 分布式训练设置
                            dataloader_num_workers=BasicConfig["num_workers"],  # 设置读取数据的线程数量
                            logging_steps=BasicConfig["logging_steps"],  # 指定打印log的步数
                            remove_unused_columns=False,  # 删除模型不需要的数据列
                            label_names=["labels"],  # 与标签对应的输入字典中的键列表
                            push_to_hub=False,
                            )
if training_args.local_rank == 0 or training_args.local_rank == -1:
    print('=' * 90)
    model.print_trainable_parameters()
    print('=' * 90)


class TempSavePeftModelCallback(TrainerCallback):
    def on_save(self,args,state, control):
        print("临时保存的")
        return control

# 定义训练器
trainer = Seq2SeqTrainer(args=training_args,
                            model=model,
                            train_dataset=common_voice["train"],
                            eval_dataset=common_voice["test"],
                            data_collator=data_collator,
                            tokenizer=processor.feature_extractor,
                            callbacks=[SavePeftModelCallback])
model.config.use_cache = False


# 开始训练
trainer.train(resume_from_checkpoint=BasicConfig["resume_from_checkpoint"])


# 保存最后的模型
trainer.save_state()

model.config.use_cache = True
if training_args.local_rank == 0 or training_args.local_rank == -1:
        model.save_pretrained(os.path.join(output_dir, "checkpoint-final"))