#include "bpt.h"

H_P * hp;

page * rt = NULL; //root is declared as global

int fd = -1; //fd is declared as global

// read header page
H_P * load_header(off_t off) {
    H_P * newhp = (H_P*)calloc(1, sizeof(H_P));
    if (sizeof(H_P) > pread(fd, newhp, sizeof(H_P), 0)) {

        return NULL;
    }
    return newhp;
}

// read certain offest page
page * load_page(off_t off) {
    page* load = (page*)calloc(1, sizeof(page));
    //if (off % sizeof(page) != 0) printf("load fail : page offset error\n");
    if (sizeof(page) > pread(fd, load, sizeof(page), off)) {

        return NULL;
    }
    return load;
}

// open table with pathname (if exist, load existing header page & root page / else, create new header file)
int open_table(char * pathname) {
    fd = open(pathname, O_RDWR | O_CREAT | O_EXCL | O_SYNC  , 0775);
    hp = (H_P *)calloc(1, sizeof(H_P));
    if (fd > 0) {
        //printf("New File created\n");
        hp->fpo = 0;
        hp->num_of_pages = 1;
        hp->rpo = 0;
        pwrite(fd, hp, sizeof(H_P), 0);
        free(hp);
        hp = load_header(0);
        return 0;
    }
    fd = open(pathname, O_RDWR|O_SYNC);
    if (fd > 0) {
        //printf("Read Existed File\n");
        if (sizeof(H_P) > pread(fd, hp, sizeof(H_P), 0)) {
            return -1;
        }
        off_t r_o = hp->rpo;
        rt = load_page(r_o);
        return 0;
    }
    else return -1;
}

// reset certain offset page (initialize new page)
void reset(off_t off) {
    page * reset;
    reset = (page*)calloc(1, sizeof(page));
    reset->parent_page_offset = 0;
    reset->is_leaf = 0;
    reset->num_of_keys = 0;
    reset->next_offset = 0;
    pwrite(fd, reset, sizeof(page), off);
    free(reset);
    return;
}

// free certain offset page (free existing page) (page structure already exists)
void freetouse(off_t fpo) {
    page * reset;
    reset = load_page(fpo);
    reset->parent_page_offset = 0;
    reset->is_leaf = 0;
    reset->num_of_keys = 0;
    reset->next_offset = 0;
    pwrite(fd, reset, sizeof(page), fpo);
    free(reset);
    return;
}

// add new free page in free page list and update header page's free page #
void usetofree(off_t wbf) {
    page * utf = load_page(wbf);
    utf->parent_page_offset = hp->fpo;
    utf->is_leaf = 0;
    utf->num_of_keys = 0;
    utf->next_offset = 0;
    pwrite(fd, utf, sizeof(page), wbf);
    free(utf);
    hp->fpo = wbf;
    pwrite(fd, hp, sizeof(hp), 0);
    free(hp);
    hp = load_header(0);
    return;
}


off_t new_page() {
    off_t newp;
    page * np;
    off_t prev;
    if (hp->fpo != 0) {
        newp = hp->fpo;
        np = load_page(newp);
        hp->fpo = np->parent_page_offset;
        pwrite(fd, hp, sizeof(hp), 0);
        free(hp);
        hp = load_header(0);
        free(np);
        freetouse(newp);
        return newp;
    }
    //change previous offset to 0 is needed
    newp = lseek(fd, 0, SEEK_END);
    //if (newp % sizeof(page) != 0) printf("new page made error : file size error\n");
    reset(newp);
    hp->num_of_pages++;
    pwrite(fd, hp, sizeof(H_P), 0);
    free(hp);
    hp = load_header(0);
    return newp; // new page offset
}

// count node usage (ceil(n/2))
int cut(int length) {
    if (length % 2 == 0)
        return length / 2;
    else
        return length / 2 + 1;
}


// start new file by making new root page with new record
void start_new_file(record rec) {
    page * root;
    off_t ro;
    ro = new_page();
    rt = load_page(ro);
    hp->rpo = ro;
    pwrite(fd, hp, sizeof(H_P), 0);
    free(hp);
    hp = load_header(0);
    rt->num_of_keys = 1;
    rt->is_leaf = 1;
    rt->records[0] = rec;
    pwrite(fd, rt, sizeof(page), hp->rpo);
    free(rt);
    rt = load_page(hp->rpo);
    //printf("new file is made\n");
}

// Trace the path from root to a leaf, searching by key.
// Return the leaf containing the given key value.
off_t find_leaf(int64_t key) {
    int i = 0;
    page * c = rt;
    off_t leaf_offset;

    leaf_offset = hp->rpo;

    if (c == NULL) {  // root page does not exist in data file.
        return 0;
    }
    while (!c->is_leaf) { // search B+tree internal pages
        i = 0;
        while (i < c->num_of_keys) {
            if (key >= c->b_f[i].key) i++;
            else break;
        }
        if (i == 0) { // If finding key is smaller than the left most key value.
            leaf_offset = c->next_offset;
        }
        else {
            leaf_offset = c->b_f[i - 1].p_offset;
        }
        if (c != rt) free(c);
        c = load_page(leaf_offset); // set c to lower page containing key value.
    }
    if (c != rt) free(c);
    return leaf_offset; // return leaf page offset containing key value
}

// Find record that contains certain key and return value.
char * db_find(int64_t key) {
    int i = 0;
    char *value = NULL; // to store return value
    // find leaf page, which contains certain key value
    off_t leaf_offset = find_leaf(key);
    
    if (leaf_offset == 0) {
        // printf("leaf offset equals 0.\n");
        return NULL;
    }
    page * leaf_page = load_page(leaf_offset);

    if (leaf_page == NULL) {
        // printf("leaf page not found.\n");
        return NULL;  // leaf page do not exist
    }
    for (i = 0; i < leaf_page->num_of_keys; i++)
        if (leaf_page->records[i].key == key) 
            break; // if key matches

    if (i == leaf_page->num_of_keys) { // key value does not exist in data file
        // printf("Key not in leaf!\n");
        free(leaf_page);
        return NULL;
    }
    else {
        value = (char *)malloc(strlen(leaf_page->records[i].value) + 1);
        if (value != NULL) {
            strcpy(value, leaf_page->records[i].value); // return matching value
        }
        free(leaf_page);
        return value;
    }
}

// Make new record struct and return
record make_record(int64_t key, char * value) {
    record new_rec;
    // copy key
    new_rec.key = key;
    // copy value
    strncpy(new_rec.value, value, sizeof(new_rec.value) - 1);

    new_rec.value[sizeof(new_rec.value) - 1] = '\0'; // set last character as null

    return new_rec;
}

// Insert new record into a leaf.
void insert_into_leaf(off_t leaf_offset, page * leaf, record rec) {
    int i, insertion_point;

    insertion_point = 0;
    // Find the matching insertion point.
    while (insertion_point < leaf->num_of_keys && leaf->records[insertion_point].key < rec.key)
        insertion_point++;
    
    // Move original records to right by index 1.
    for (i = leaf->num_of_keys; i > insertion_point; i--)
        leaf->records[i] = leaf->records[i - 1];
    
    // Insert new record & add num_of_keys by 1.
    leaf->records[insertion_point] = rec;
    leaf->num_of_keys++;

    // write to disk and reload
    pwrite(fd, leaf, sizeof(page), leaf_offset);
}

// Make new root page and update
void insert_into_new_root(off_t left_offset, page * left, int64_t key, off_t right_offset, page * right) {
    page * root;
    off_t ro;

    // Make new root page and write in header page root page offset field.
    ro = new_page();
    rt = load_page(ro);
    hp->rpo = ro;
    pwrite(fd, hp, sizeof(H_P), 0);
    free(hp);
    hp = load_header(0);

    // Set initial root page attributes.
    rt->num_of_keys++;
    rt->next_offset = left_offset;
    rt->b_f[0].key = key;
    rt->b_f[0].p_offset = right_offset;
    // rt->parent_page_offset = 0;

    // write the new root page into disk
    pwrite(fd, rt, sizeof(page), hp->rpo);
    // free(rt);
    // rt = load_page(hp->rpo);

    // Change leaf parent page offset with new root page.
    left->parent_page_offset = ro;
    right->parent_page_offset = ro;

    // write updated child pages into disk
    pwrite(fd, left, sizeof(page), left_offset);
    pwrite(fd, right, sizeof(page), right_offset);
}

int get_left_index(page * parent, off_t left_offset) {
    int left_idx = 0;

    // If left offset is in next_offset field
    if (parent->next_offset == left_offset)
        return -1;

    // Search while matching offset is found.
    while (left_idx < parent->num_of_keys && parent->b_f[left_idx].p_offset != left_offset)
        left_idx++;

    return left_idx;
}

// Insert a new key and offset value to a internal page.
void insert_into_node(off_t parent_offset, int left_index, int64_t key, off_t right_offset) {
    int i;
    page * parent = load_page(parent_offset);

    if (left_index == -1) { // left page is in next_offset field
        for (i = parent->num_of_keys; i > 0; i--) {
            parent->b_f[i] = parent->b_f[i - 1];
        }
    }
    else {
        // move parent page's internal record to right by 1
        for (i = parent->num_of_keys - 1; i > left_index; i--)
            parent->b_f[i + 1] = parent->b_f[i];
    }
    
    // add new internal records to target position
    parent->b_f[left_index + 1].key = key;
    parent->b_f[left_index + 1].p_offset = right_offset;
    parent->num_of_keys++;

    // write parent page into disk
    pwrite(fd, parent, sizeof(page), parent_offset);
    free(parent);

    // reload rt
    free(rt);
    rt = load_page(hp->rpo);
}

// Insert a new key, offset record into internal page and causing split.
void insert_into_node_after_splitting(off_t parent_offset, int left_index, int64_t key, off_t right_offset) {
    int i, j, split;
    int64_t k_prime;
    off_t n_page_offset;
    page * n_page, * child;
    I_R temp_b_f[INTERNAL_MAX + 1]; // memory to store internal record temporarilly.
    page * old_page = load_page(parent_offset);

    /* First create a temporary set of keys and pointers
     * to hold everything in order, including
     * the new key and pointer, inserted in their
     * correct places. 
     * Then create a new page and copy half of the 
     * keys and pointers to the old page and
     * the other half to the new.
     */

    // Make a room for new internal record and order records in temporary b_f.
    for (i = 0, j = 0; i < old_page->num_of_keys; i++, j++) {
        if (j == left_index + 1) j++;
        temp_b_f[j] = old_page->b_f[i];
    }

    // Insert new internal record
    temp_b_f[left_index + 1].key = key;
    temp_b_f[left_index + 1].p_offset = right_offset;

    split = cut(INTERNAL_MAX + 1); // minimum pointers
    // Create new internal page
    n_page_offset = new_page();
    n_page = load_page(n_page_offset);

    old_page->num_of_keys = 0;
    // save first half of b_f in old page
    for (i = 0; i < split; i++) {
        old_page->b_f[i] = temp_b_f[i];
        old_page->num_of_keys++;
    }

    // Update first offset of new page and save the value of key in the middle to pass to upper page.
    n_page->next_offset = temp_b_f[i].p_offset;
    k_prime = temp_b_f[split].key;

    // save remaining half into new page
    for (++i, j = 0; i < INTERNAL_MAX + 1; i++, j++) {
        n_page->b_f[j] = temp_b_f[i];
        n_page->num_of_keys++;
    }

    // Update parent page offset value of new internal page and its descendants.
    n_page->parent_page_offset = old_page->parent_page_offset;

    child = load_page(n_page->next_offset);
    child->parent_page_offset = n_page_offset;
    pwrite(fd, child, sizeof(page), n_page->next_offset);
    free(child);

    for (i = 0; i < n_page->num_of_keys; i++) {
        child = load_page(n_page->b_f[i].p_offset);
        child->parent_page_offset = n_page_offset;
        pwrite(fd, child, sizeof(page), n_page->b_f[i].p_offset);
        free(child);
    }

    // write old and new page to disk
    pwrite(fd, old_page, sizeof(page), parent_offset);
    pwrite(fd, n_page, sizeof(page), n_page_offset);

    // Apply to parent page again with leftmost value of new internal page.
    insert_into_parent(parent_offset, old_page, k_prime, n_page_offset, n_page);

    free(old_page);
    free(n_page);
}

void insert_into_parent(off_t left_offset, page * left, int64_t key, off_t right_offset, page * right) {
    int left_index;
    off_t parent_offset;

    parent_offset = left->parent_page_offset;
    page * parent = load_page(parent_offset);

    // Case : new root.
    if (parent_offset == 0) {
        // printf("Insert into new root!\n");
        insert_into_new_root(left_offset, left, key, right_offset, right);
        return;
    }

    // Find index of parent's pointer to the left page
    left_index = get_left_index(parent, left_offset);

    // Simple case: the new key fits into parent page.
    if (parent->num_of_keys < INTERNAL_MAX) {
        // printf("Insert into node\n");
        insert_into_node(parent_offset, left_index, key, right_offset);
        return;
    }

    // Hard case: split parent page again and insert new internal record.
    // printf("insert into node after splitting!\n");
    insert_into_node_after_splitting(parent_offset, left_index, key, right_offset);
}

// If there is no room in leaf & key-rotation is unavailable, split and insert.
void insert_into_leaf_after_splitting(off_t leaf_offset, page * leaf, record rec) {
    page * new_leaf;
    off_t new_offset;
    int insertion_index, split, i, j;
    int64_t new_key;

    // Allocate temporary memory for split.
    record temp_records[LEAF_MAX + 1];

    // Make new leaf page
    new_offset = new_page();
    new_leaf = load_page(new_offset);
    new_leaf->is_leaf = 1;

    insertion_index = 0;
    // Find the matching insertion point.
    while (insertion_index < LEAF_MAX && leaf->records[insertion_index].key < rec.key)
        insertion_index++;
    
    for (i = 0, j = 0; i < leaf->num_of_keys; i++, j++) {
        if (j == insertion_index) j++;
        temp_records[j] = leaf->records[i]; // save original leaf items and make insertion space empty.
    }

    temp_records[insertion_index] = rec; // allocate new record to insertion index

    leaf->num_of_keys = 0;

    // Calculate ceil of n/2
    split = cut(LEAF_MAX);

    // Save half (= ceil of n/2) records into original leaf node
    for (i = 0; i < split; i++) {
        leaf->records[i] = temp_records[i];
        leaf->num_of_keys++;
    }

    // Save remaining records into new leaf node
    for (i = split, j = 0; i < LEAF_MAX + 1; i++, j++) {
        new_leaf->records[j] = temp_records[i];
        new_leaf->num_of_keys++;
    }
    
    // Link using right sibling page offset [120-127] in page header.
    new_leaf->next_offset = leaf->next_offset;
    leaf->next_offset = new_offset;

    // Update parent page offset
    new_leaf->parent_page_offset = leaf->parent_page_offset;

    // Write to disk
    pwrite(fd, leaf, sizeof(page), leaf_offset);
    pwrite(fd, new_leaf, sizeof(page), new_offset);
    
    // key for updating parent page
    new_key = new_leaf->records[0].key;

    insert_into_parent(leaf_offset, leaf, new_key, new_offset, new_leaf);

    free(new_leaf);
}

int try_key_rotation_insert(off_t leaf_offset, page * leaf, record rec) {
    // Check if there is a right sibling (neighbor)
    if (leaf->next_offset == 0) {
        return 0; // No right sibling, cannot do key rotation (return -1, do split)
    }

    page * right_sibling = load_page(leaf->next_offset);
    page * parent;
    off_t parent_offset = 0, lower_page_offset;

    // Check if the right sibling has space for one more record
    if (right_sibling->num_of_keys < LEAF_MAX) {
        int i, insertion_index;

        // Move records in the right sibling to right by 1 to make space for the new key
        for (i = right_sibling->num_of_keys; i > 0; i--) {
            right_sibling->records[i] = right_sibling->records[i - 1];
        }

        // Calculate insertion index of new key value
        insertion_index = 0;
        while (insertion_index < leaf->num_of_keys && leaf->records[insertion_index].key < rec.key)
            insertion_index++;
    
        if (insertion_index == leaf->num_of_keys) { // New key value is larger than other key values in leaf page.
            // Directly move new record to the right sibling page
            right_sibling->records[0] = rec;
            right_sibling->num_of_keys++;
        }
        else {
            // Move rightmost record in leaf page to right sibling page
            right_sibling->records[0] = leaf->records[leaf->num_of_keys - 1];
            right_sibling->num_of_keys++;

            // Make a room for new record.
            for(i = insertion_index; i < leaf->num_of_keys - 1; i++) {
                leaf->records[i + 1] = leaf->records[i];
            }

            // Add new record in right place.
            leaf->records[insertion_index] = rec;
        }

        // Update the parent key if necessary
        if (leaf->parent_page_offset == right_sibling->parent_page_offset) { // If they have same parent page. Just consider direct parent page. 
            parent = load_page(leaf->parent_page_offset);
            // Update key value between target leaf and right sibling
            for (i = 0; i < parent->num_of_keys; i++) {
                if (parent->b_f[i].p_offset == leaf->next_offset) {
                    parent->b_f[i].key = right_sibling->records[0].key;
                    break;
                }
            }
            // Write changes to disk
            pwrite(fd, parent, sizeof(page), leaf->parent_page_offset);
            free(parent);  
        }
        else { // If they have different parent page, then need to search every parent pages to root.
            lower_page_offset = leaf->next_offset;
            parent_offset = right_sibling->parent_page_offset;
            while (parent_offset != hp->rpo) { // until it reaches to root
                parent = load_page(parent_offset);
                
                // If the pointer to right sibling page is leftmost pointer of parent page. (Do not have to consider.)
                if (lower_page_offset == parent->next_offset) {
                    lower_page_offset = parent_offset;
                    parent_offset = parent->parent_page_offset; // search parent's parent
                    free(parent);
                    continue;
                }

                for (i = 0; i < parent->num_of_keys; i++) {
                    if (parent->b_f[i].p_offset == lower_page_offset) {
                        if (parent->b_f[i].key > right_sibling->records[0].key) {
                            parent->b_f[i].key = right_sibling->records[0].key; // Update upper parent's key value with right sibling's first key value
                        }
                        break;
                    }
                }

                // Write changes to disk
                pwrite(fd, parent, sizeof(page), parent_offset);
                
                // Update parent and lower page offset. (Climb the tree)
                lower_page_offset = parent_offset;
                parent_offset = parent->parent_page_offset;
                free(parent);
            }
        }

        // Write changes to disk
        pwrite(fd, leaf, sizeof(page), leaf_offset);
        pwrite(fd, right_sibling, sizeof(page), leaf->next_offset);
 
        // Free resources
        free(right_sibling);

        // Reload rt
        free(rt);
        rt = load_page(hp->rpo);

        printf("key-rotation insert start!\n");

        return 1; // Key rotation successful
    }

    // Free resources and return failure
    free(right_sibling);
    return 0; // Key rotation not possible
}

int db_insert(int64_t key, char * value) {
    record rec;
    off_t leaf_offset;
    page * leaf;

    // key duplication error. 
    if (db_find(key) != NULL) {
        printf("Insertion fail! Key duplication error!\n");
        return -1;
    }

    rec = make_record(key, value);

    // If the tree does not exist yet, start a new tree.
    if (rt == NULL) {
        start_new_file(rec);
        // printf("Insertion successful!, New file started!\n");
        return 0;
    }

    // If the tree already exists
    leaf_offset = find_leaf(key);
    if (leaf_offset == 0) return -1;
    leaf = load_page(leaf_offset);

    // If leaf has room for record, just insert it.
    if (leaf->num_of_keys < LEAF_MAX) {
        insert_into_leaf(leaf_offset, leaf, rec);
        // printf("Insertion successful to leaf / Key: %ld, Value: %s\n", key, value);
        return 0;
    }

    // If key-rotation is possible, do key-rotation.
    if (try_key_rotation_insert(leaf_offset, leaf, rec)) {
        free(leaf);
        return 0;
    }

    // Else, split and insert.
    insert_into_leaf_after_splitting(leaf_offset, leaf, rec);
    free(leaf);
    printf("Insertion successful with splitting / Key: %ld, Value: %s\n", key, value);
    return 0;
}

void remove_entry_from_node(off_t page_offset, int64_t key, off_t pointer_offset) {
    int i, num_pointers, j;
    page * target_page = load_page(page_offset);

    i = 0;
    j = 0;
    // Remove the record containing the key, and move the remaining records to left
    if (target_page->is_leaf) {  // Case : Leaf page
        while (target_page->records[i].key != key)
            i++;
        for (++i; i < target_page->num_of_keys; i++)
            target_page->records[i - 1] = target_page->records[i];
    }
    else { // Case : Internal page (Need to consider next_offset field)
        // Delete key value
        while (target_page->b_f[i].key != key)
            i++;
        for (++i; i < target_page->num_of_keys; i++)
            target_page->b_f[i - 1].key = target_page->b_f[i].key;

        // Delete p_offset value (if target pointer offset is in next_offset field, delete and move all remainings left)
        while (target_page->b_f[j].p_offset != pointer_offset) {
            if (target_page->next_offset == pointer_offset) {
                j = -1;
                break;
            }
            j++;
        }
        for (++j; j < target_page->num_of_keys; j++) {
            if (j == 0)  {
                target_page->next_offset = target_page->b_f[j].p_offset;
                continue;
            }
            target_page->b_f[j - 1].p_offset = target_page->b_f[j].p_offset;
        }
    }

    target_page->num_of_keys--;

    pwrite(fd, target_page, sizeof(page), page_offset);

    free(target_page);
}

void adjust_root() {
    page * new_root;

    // Case: nonempty root => do nothing
    if (rt->num_of_keys > 0)
        return;

    // Case: empty root
    // If it has a child, promote the first child as the new root.
    if (!rt->is_leaf) {
        new_root = load_page(rt->next_offset);
        new_root->parent_page_offset = 0;
        pwrite(fd, new_root, sizeof(page), rt->next_offset);
        usetofree(hp->rpo); // free original root page and dangle to free page list
        hp->rpo = rt->next_offset;  // Change header page's root page offset with first child offset.
        pwrite(fd, hp, sizeof(H_P), 0);
        free(hp);
        hp = load_header(0);
        free(rt);
        rt = new_root; // Update new root.
        free(new_root);
    }
    else { // If root is leaf (has no children), then whole tree is empty (free root page and dangle to free page list)
        usetofree(hp->rpo);
        hp->rpo = 0;
        pwrite(fd, hp, sizeof(H_P), 0);
        free(hp);
        hp = load_header(0);
        free(rt);
        rt = NULL;
    }
}

// Find the index of a page's nearest neighbor (sibling) from the left if one exits. (If not return -2)
int get_neighbor_index(page * target_page, off_t page_offset) {
    int i;
    page * parent_page = load_page(target_page->parent_page_offset);

    // find the index of left sibling page
    if (parent_page->next_offset == page_offset) { // if target page is leftmost page, return -2
        free(parent_page);
        return -2;
    }  
    for (i = 0; i < parent_page->num_of_keys; i++) { // else return index of left page (index -1 means next_offset field)
        if (parent_page->b_f[i].p_offset == page_offset) {
            free(parent_page);
            return i - 1;
        }
    }
    // Error state
    printf("Search for nonexistent pointer to page in parent.\n");
    exit(-1);
}

// Merge a page that has become too small after deletion with a sibling page if it does not exceed the maximum.
void merge_pages(off_t page_offset, page * target_page, off_t neighbor_offset, page * neighbor_page, int neighbor_index, int64_t k_prime) {
    int i, j, neighbor_insertion_index, target_page_end;
    off_t tmp_offset;
    page * tmp_page;

    // swap neighbor with target_page if target page is on the left and neighbor page is on the right
    if (neighbor_index == -2) {
        tmp_offset = page_offset;
        page_offset = neighbor_offset;
        neighbor_offset = tmp_offset; 

        target_page = load_page(page_offset);
        neighbor_page = load_page(neighbor_offset);
    }

    // Calculate starting point in the neighbor page for copying keys and value or p_offset from n.
    neighbor_insertion_index = neighbor_page->num_of_keys;

    // Case: non-leaf page
    // Append k_prime and the following pointer.
    // Append all pointers and keys from the neighbor.
    if (!target_page->is_leaf) {
        // Append k_prime & leftmost pointer of target_page
        neighbor_page->b_f[neighbor_insertion_index].key = k_prime;
        neighbor_page->b_f[neighbor_insertion_index].p_offset = target_page->next_offset;
        neighbor_page->num_of_keys++;

        // Update parent_page_offset field of child pages and write to disk.
        tmp_offset = neighbor_page->b_f[neighbor_insertion_index].p_offset;
        tmp_page = load_page(tmp_offset);
        tmp_page->parent_page_offset = neighbor_offset;
        pwrite(fd, tmp_page, sizeof(page), tmp_offset);
        free(tmp_page);

        target_page_end = target_page->num_of_keys;

        // Copy all remaining keys and pointers of target page to neighbor page
        for (i = neighbor_insertion_index + 1, j = 0; j < target_page_end; i++, j++) {
            neighbor_page->b_f[i] = target_page->b_f[j];
            neighbor_page->num_of_keys++;
            target_page->num_of_keys--;

            // Update parent_page_offset field of child pages and write to disk.
            tmp_offset = neighbor_page->b_f[i].p_offset;
            tmp_page = load_page(tmp_offset);
            tmp_page->parent_page_offset = neighbor_offset;
            pwrite(fd, tmp_page, sizeof(page), tmp_offset);
            free(tmp_page);
        }
    }

    // If target page is a leaf. (Append keys and pointer of target_page to neighbor page and update next_offset field)
    else {
        // copy records to neighbor page
        for (i = neighbor_insertion_index, j = 0; j < target_page->num_of_keys; i++, j++) {
            neighbor_page->records[i] = target_page->records[j];
            neighbor_page->num_of_keys++;
        }

        // Update neighbor page's pointer to next page with right page pointer
        neighbor_page->next_offset = target_page->next_offset;
    }

    // Write updated neighbor page to disk
    pwrite(fd, neighbor_page, sizeof(page), neighbor_offset);

    // Delete pointer to target_page at parent page.
    delete_entry(target_page->parent_page_offset, k_prime, page_offset);

    // Free target page and dangle to free page list
    usetofree(page_offset);

    // Reload rt
    free(rt);
    rt = load_page(hp->rpo);
}

// Redistribute entries between two pages when one has become too small after deletion
// but, its neighbor is too big to append the original page entries. (exceed maximum)
void redistribute_pages(off_t page_offset, page * target_page ,off_t neighbor_offset, page * neighbor_page ,int neighbor_index, int k_prime_index, int64_t k_prime) {
    int i;
    off_t tmp_offset;
    page * tmp_page;

    // Case: target page has a neighbor page to the left
    // Pull the neighbor page's rightmost pair to target page's left end.
    if (neighbor_index != -2) {
        // Move records of target page to right by 1
        if (!target_page->is_leaf) { // If target page is internal page, need to consider next_offset field
            for (i = target_page->num_of_keys; i > 0; i--) {
                target_page->b_f[i] = target_page->b_f[i - 1];
            }
            target_page->b_f[0].p_offset = target_page->next_offset;
        }
        else { // If target page is leaf page
            for (i = target_page->num_of_keys; i > 0; i--) {
                target_page->records[i] = target_page->records[i - 1];
            }
        }
        // Pull the neighbor page's rightmost pair to target page's left end.
        if (!target_page->is_leaf) { // If target page is internal page, need to consider child page's parent_page_offset field
            target_page->next_offset = neighbor_page->b_f[neighbor_page->num_of_keys - 1].p_offset;

            // Update child page's parent_page_offset field to target_page and write to disk.
            tmp_offset = target_page->next_offset;
            tmp_page = load_page(tmp_offset);
            tmp_page->parent_page_offset = page_offset;
            pwrite(fd, tmp_page, sizeof(page), tmp_offset);
            free(tmp_page);

            // Update target_page's key value and parent page's key value and write to disk.
            target_page->b_f[0].key = k_prime;
            tmp_page = load_page(target_page->parent_page_offset);
            tmp_page->b_f[k_prime_index + 1].key = neighbor_page->b_f[neighbor_page->num_of_keys - 1].key;
            pwrite(fd, tmp_page, sizeof(page), target_page->parent_page_offset);
            free(tmp_page);
        }
        else { // If target page is leaf page
            target_page->records[0] = neighbor_page->records[neighbor_page->num_of_keys - 1];

            // Update parent page's key with added leftmost key value of target page and write to disk.
            tmp_page = load_page(target_page->parent_page_offset);
            tmp_page->b_f[k_prime_index + 1].key = target_page->records[0].key; 
            pwrite(fd, tmp_page, sizeof(page), target_page->parent_page_offset);
            free(tmp_page);
        }
    }
    // Case: target_page is the leftmost child.
    // Pull the neighbor page's leftmost key-point pair to target page's rightmost position.
    else {
        if (target_page->is_leaf) { // If target page is leaf page
            // get the leftmost key & value of neighbor page to target page's rightmost position
            target_page->records[target_page->num_of_keys] = neighbor_page->records[0];

            // Update parent page's key value with new leftmost key of neighbor page and write to disk
            tmp_page = load_page(target_page->parent_page_offset);
            tmp_page->b_f[k_prime_index + 1].key = neighbor_page->records[1].key;
            pwrite(fd, tmp_page, sizeof(page), target_page->parent_page_offset);
            free(tmp_page);

            // Move remaining records in neighbor page to left by 1
            for (i = 0; i < neighbor_page->num_of_keys - 1; i++) {
                neighbor_page->records[i] = neighbor_page->records[i + 1];
            }
        }
        else { // If target page is internal page
            target_page->b_f[target_page->num_of_keys].key = k_prime;
            target_page->b_f[target_page->num_of_keys].p_offset = neighbor_page->next_offset; 

            // Update child page's parent_page_offset field to target_page and write to disk.
            tmp_offset = target_page->b_f[target_page->num_of_keys].p_offset;
            tmp_page = load_page(tmp_offset);
            tmp_page->parent_page_offset = page_offset;
            pwrite(fd, tmp_page, sizeof(page), tmp_offset);
            free(tmp_page);

            // Update parent page's key value with neighbor page's leftmost key value and write to disk.
            tmp_page = load_page(target_page->parent_page_offset);
            tmp_page->b_f[k_prime_index + 1].key = neighbor_page->b_f[0].key;
            pwrite(fd, tmp_page, sizeof(page), target_page->parent_page_offset);
            free(tmp_page);

            // Move remaining records in neighbor page to left by 1
            for (i = 0; i < neighbor_page->num_of_keys - 1; i++) {
                if (i == 0) {
                    neighbor_page->next_offset = neighbor_page->b_f[0].p_offset;
                }
                neighbor_page->b_f[i] = neighbor_page->b_f[i + 1];
            }
        }
    }

    // Update number of keys from both target page & neighbor page and write them to disk.
    target_page->num_of_keys++;
    neighbor_page->num_of_keys--;
    pwrite(fd, target_page, sizeof(page), page_offset);
    pwrite(fd, neighbor_page, sizeof(page), neighbor_offset);

    // Reload rt
    free(rt);
    rt = load_page(hp->rpo);
}

// Delete an entry in B+ tree from leaf to all possible pages.
void delete_entry(off_t page_offset, int64_t key, off_t pointer_offset) {
    int min_keys;
    int neighbor_index;
    int k_prime_index;
    int64_t k_prime;
    int capacity;
    off_t neighbor_offset;
    page * target_page, * parent_page, * neighbor_page;

    // remove key and offset from page.
    remove_entry_from_node(page_offset, key, pointer_offset);
    target_page = load_page(page_offset);

    // Case: deletion from the root
    if (page_offset == hp->rpo) {
        adjust_root();
        free(target_page);
        return;
    }

    // Case: deletion from a page below the root.

    // Calculate minimum allowable size of page to be preserved after deletion.
    min_keys = target_page->is_leaf ? cut(LEAF_MAX) : cut(INTERNAL_MAX + 1) - 1;

    // Case: page stays at or above minimum. (Simple case)
    if (target_page->num_of_keys >= min_keys) {
        free(target_page);
        return;
    }

    // Case: page falls below minimum. (Merge of Redistribute)
    parent_page = load_page(target_page->parent_page_offset);
    neighbor_index = get_neighbor_index(target_page, page_offset); // get nearest sibling page index
    k_prime_index = neighbor_index == -2 ? -1 : neighbor_index; // if target page is leftmost page
    k_prime = parent_page->b_f[k_prime_index + 1].key; // key of left page
    if (neighbor_index == -2) { // target_page is in parent page's next_offset field (leftmost page)
        neighbor_offset = parent_page->b_f[0].p_offset;
    }
    else if (neighbor_index == -1) { // target_page is first index of b_f array. (left sibling is next_offset field)
        neighbor_offset = parent_page->next_offset;
    }
    else { // other cases
        neighbor_offset = parent_page->b_f[neighbor_index].p_offset;
    }

    capacity = target_page->is_leaf ? LEAF_MAX : INTERNAL_MAX;

    neighbor_page = load_page(neighbor_offset);

    // If there is room for merge
    if (neighbor_page->num_of_keys + target_page->num_of_keys < capacity) {
        printf("merge start!\n");
        merge_pages(page_offset, target_page, neighbor_offset, neighbor_page, neighbor_index, k_prime);
    }
    // Else, redistribute
    else {
        printf("redistribute start!\n");
        redistribute_pages(page_offset, target_page, neighbor_offset, neighbor_page, neighbor_index, k_prime_index, k_prime);
    }
    free(target_page);
    free(neighbor_page);
    free(parent_page);
}

int db_delete(int64_t key) {
    off_t leaf_offset;
    page * leaf_page;
    int i;

    // find leaf page containing key value.
    leaf_offset = find_leaf(key);
    if (leaf_offset == 0) { // Key not found
        return -1;
    }
    leaf_page = load_page(leaf_offset);
    
    for (i = 0; i < leaf_page->num_of_keys; i++) {
        if (leaf_page->records[i].key == key)
            break;
    }

    // Key not found
    if (i == leaf_page->num_of_keys) {
        free(leaf_page);
        return -1;
    }

    delete_entry(leaf_offset, key, 0);
    
    free(leaf_page);

    free(rt);
    rt = load_page(hp->rpo);

    printf("Deletion successful Key: %ld\n", key);
    return 0;
}//fin








