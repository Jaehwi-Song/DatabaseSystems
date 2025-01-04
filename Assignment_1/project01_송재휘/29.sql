SELECT User.name
FROM (User join RaisingCharacter on User.id=owner_id)
      join PlayableCharacter on cid=PlayableCharacter.id 
WHERE branch not in (SELECT branch
                     FROM PlayableCharacter                      
                     WHERE class="Resistance") 
GROUP BY User.id 
HAVING count(*)=(SELECT max(not_regis_count)
                 FROM (SELECT count(*) as not_regis_count                        
                       FROM (User join RaisingCharacter on User.id=owner_id)                             
                             join PlayableCharacter on cid=PlayableCharacter.id                        
                       WHERE branch not in (SELECT branch                                             
                                            FROM PlayableCharacter                                             
                                            WHERE class="Resistance")                        
                       GROUP BY User.id) as Not_Regis);