select_ln_app() {
    bol=1
    while [ "$bol" -eq 1 ]
    do
        read -r -s -n 1 -p "是否自动更新此版本（回车确认）？[Y/n]" input
        case $input in
            [yY][eE][sS]|[yY]|'')
                bol=0
                echo ""
                return 1
                ;;

            [nN][oO]|[nN])
                bol=0
                return 0
                ;;
            *)
                echo "输入错误🙅，请重新输入"
                ;;
        esac
    done
}

# 🌰
# select_ln_app
# isUpgrade=$?
# if [ $isUpgrade == 1 ];then
#     echo "Yeah"
# fi