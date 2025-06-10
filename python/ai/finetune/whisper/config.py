import os
from pathlib import Path

isDebug = False

# 数据集的原始路径
originPath = Path("/Zayne/fine-turning-whisper-turbo/dev/origin-datasets").resolve()

if isDebug:
    testp = [originPath / "dev"]
    trainp = testp
else:
    testp = [originPath / "肝-test"]
    trainp = [originPath / "肝-train"]

# 训练数据集路径
def generate_path(dir):
    paths = []
    for p in dir:
        for fp in os.listdir(p):
            paths.append(str(p / fp))
    return paths


# "./finetune/small-finetune-final"
BasicConfig = {
    "model_path": "/openai/whisper-large-v3-turbo",
    "output_dir": "output/whisper-large-v3-turbo-finetune",



    # ------------ 预处理配置 ------------
    
    # 训练时是否使用时间戳数据
    "timestamps": False,
    # 是否只在本地加载模型，不尝试下载
    "local_files_only": True,
    # datasets 数据的disk路径 「要经过数据预处理后保存的路径」
    "full_datasets_disk_path": "./res-datasets/basic",
    
    # 预处理的数据集
    "preprocess_datasets": {
        "trainD":  generate_path(trainp),
        "testD": generate_path(testp),
    },

    # ------------ 训练配置项 ------------
    # 训练的batch size
    "per_device_train_batch_size": 40, 
    # 评估的batch size
    "per_device_eval_batch_size": 8,
    # 梯度累积步数 
    "gradient_accumulation_steps": 2,
    # 学习率大小
    "learning_rate": 1e-5,
    # 总训练步数
    # 假设每个batch有16个样本，训练集11k，那么每个epoch的步数是11000/16≈687步。通常微调可能需要3-10个epoch
    "max_steps": 1000, # 8轮 # 总步数 = (训练样本数 × epoch数) / (batch_size × GPU数)
    # 预热步数 -> 通常占总训练步数的5-10%
    "warmup_steps": 400,
    # 微调训练轮数
    "num_train_epochs": 20,
    # 是否使用半精度训练
    "fp16": True,
    # 指定保存检查点的步数
    "save_steps": 1000,
    # 指定评估模型的步数
    "eval_steps": 1000,
    # 使用Pytorch2.0的编译器
    "use_compile": False,
    # 只保存最新检查点的数量
    "save_total_limit": 10,
    # 设置读取数据的线程数量
    "num_workers": 8,
    # 指定打印log的步数
    "logging_steps":500,

# 恢复训练的检查点路径
    "resume_from_checkpoint": None,

}