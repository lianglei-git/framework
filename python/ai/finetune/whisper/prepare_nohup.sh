nohup python -u prepare_dataset_setup1.py > logs/prepare_datasets1.file 2>&1 &
nohup python -u prepare_dataset_setup2.py > logs/prepare_datasets2.file 2>&1 &
nohup python -u finetune_setup3.py > logs/finetune_setup3.file 2>&1 &


nohup python -u finetune_lora.py > logs/finetune_lora_20250603.log 2>&1 &
