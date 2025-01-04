SELECT owner_id, count(branch)
FROM PlayableCharacter join RaisingCharacter on PlayableCharacter.id=cid    
WHERE branch="Warrior"             
GROUP BY owner_id
HAVING count(branch)=(SELECT max(warrior_count)
                      FROM (SELECT count(branch) as warrior_count
                            FROM PlayableCharacter join RaisingCharacter on PlayableCharacter.id=cid
                            WHERE branch="Warrior"             
                            GROUP BY owner_id)
                            as Warrior_table);