#ifndef __BPT_H__
#define __BPT_H__

// Uncomment the line below if you are compiling on Windows.
// #define WINDOWS
#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <stdint.h>
#include <sys/types.h>
#include <fcntl.h>
#include <unistd.h>
#include <inttypes.h>
#include <string.h>
#define LEAF_MAX 31
#define INTERNAL_MAX 248

typedef struct record{
    int64_t key;
    char value[120];
}record;

typedef struct inter_record {
    int64_t key;
    off_t p_offset;
}I_R;

typedef struct Page{
    off_t parent_page_offset;
    int is_leaf;
    int num_of_keys;
    char reserved[104];
    off_t next_offset;
    union{
        I_R b_f[248];
        record records[31];
    };
}page;

typedef struct Header_Page{
    off_t fpo;
    off_t rpo;
    int64_t num_of_pages;
    char reserved[4072];
}H_P;


extern int fd;

extern page * rt;

extern H_P * hp;
// FUNCTION PROTOTYPES.
int open_table(char * pathname);
H_P * load_header(off_t off);
page * load_page(off_t off);

void reset(off_t off);
off_t new_page();
void freetouse(off_t fpo);
int cut(int length);
int parser();
void start_new_file(record rec);

// Find
off_t find_leaf(int64_t key);
char * db_find(int64_t key);

// Insertion
record make_record(int64_t key, char * value);
void insert_into_new_root(off_t left_offset, page * left, int64_t key, off_t right_offset, page * right);
int get_left_index(page * parent, off_t left_offset);
void insert_into_node(off_t parent_offset, int left_index, int64_t key, off_t right_offset);
void insert_into_node_after_splitting(off_t parent_offset, int left_index, int64_t key, off_t right_offset);
void insert_into_parent(off_t left_offset, page * left, int64_t key, off_t right_offset, page * right);
void insert_into_leaf(off_t leaf_offset, page * leaf, record rec);
void insert_into_leaf_after_splitting(off_t leaf_offset, page * leaf, record rec);
int try_key_rotation_insert(off_t leaf_offset, page * leaf, record rec);
int db_insert(int64_t key, char * value);

// Deletion
void remove_entry_from_node(off_t page_offset, int64_t key, off_t pointer_offset);
void adjust_root();
int get_neighbor_index(page * target_page, off_t page_offset);
void merge_pages(off_t page_offset, page * target_page, off_t neighbor_offset, page * neighbor_page, int neighbor_index, int64_t k_prime);
void redistribute_pages(off_t page_offset, page * target_page ,off_t neighbor_offset, page * neighbor_page ,int neighbor_index, int k_prime_index, int64_t k_prime);
void delete_entry(off_t page_offset, int64_t key, off_t pointer_offset);
int db_delete(int64_t key);

#endif /* __BPT_H__*/


