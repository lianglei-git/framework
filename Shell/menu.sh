#!/bin/bash
options=("node" "go" "web" "desktop" "python")
selected_index=0
ostype="unknown"

# 判断系统
if [[ "$OSTYPE" == "darwin"* ]]; then
    ostype="macos"
  echo "This is Mac OS"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  echo "This is Linux"
  ostype="linux"
else
  echo "Unknown operating system"
  ostype="unknown"
fi

# 输出目录
print_menu() {
    clear
    echo "🚗 选择启动项目: "
    for i in "${!options[@]}"; do
        if [ "$i" -eq "$selected_index" ]; then
            echo ">> ${options[$i]}"
        else
            echo "   ${options[$i]}"
        fi
    done
}

# 选择菜单
handle_input() {
    read -s -n 1 key
    case $key in
        'A') # Up arrow key
            ((selected_index--))
            if [ "$selected_index" -lt 0 ]; then
                selected_index=$((${#options[@]} - 1))
            fi
            ;;
        'B') # Down arrow key
            ((selected_index++))
            if [ "$selected_index" -ge "${#options[@]}" ]; then
                selected_index=0
            fi
            ;;
        '') # Enter key
        selected="${options[$selected_index]}"
            startup $selected
            exit 0
            ;;
    esac
}

# 启动项目
function startup {
 case $1 in
    'go')
        # 适用打包📦
        if [ $ostype == "macos" ];then
            go env -w CGO_ENABLED=0 GOOS=darwin GOARCH=amd64
        elif [ $ostype == "linux" ];then
            go env -w CGO_ENABLED=0 GOOS=linux GOARCH=amd64
        fi

        cd server/golang && go run .

        echo "go";;
    'node')
        pnpm run -C server/node start
        echo "node";;
    'web')
        pnpm run -C frontend/web start
        echo "web";;
    'python')
        echo "python";;
    'desktop')
        pnpm run -C frontend/electron start
        echo "desktop";;

    esac
}

function handle_error(){
    echo "发生错误，请检查日志或其他输出以获取更多信息。"
    exit 1
}

trap 'handle_error' ERR

while true; do
    print_menu
    handle_input
done
