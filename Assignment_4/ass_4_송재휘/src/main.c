#include "bpt.h"

int main(){
    int64_t input;
    char instruction;
    char buf[120];
    char *result;
    int table_num;

    // Assignment 4
    // open_table("test.db");
    // "table1.db", "table2.db"라는 두 파일을 열 수 있게 수정
    int table1_fd = open_table("table1.db");
    int table2_fd = open_table("table2.db");
    while(scanf("%c", &instruction) != EOF){
        switch(instruction){
            case 's':
                print_current_file(table1_fd, table2_fd);
                printf("Enter 1 or 2 to switch table (1 : table1.db, 2 : table2.db) : ");
                scanf("%d", &table_num);
                switch_table(table_num, table1_fd, table2_fd);
                break;
            case 'i':
                scanf("%ld %s", &input, buf);
                db_insert(input, buf);
                break;
            case 'f':
                scanf("%ld", &input);
                result = db_find(input);
                if (result) {
                    printf("Key: %ld, Value: %s\n", input, result);
                    free(result);
                }
                else
                    printf("Not Exists\n");

                fflush(stdout);
                break;
            case 'd':
                scanf("%ld", &input);
                db_delete(input);
                break;
            
            // Assignment 4
            case 'j':
                db_join(table1_fd, table2_fd);
                break;


            //////////////////////////////////////////////////////////////////

            case 'q':
                while (getchar() != (int)'\n');
                return EXIT_SUCCESS;
                break;   

        }
        while (getchar() != (int)'\n');
    }
    printf("\n");
    return 0;
}



