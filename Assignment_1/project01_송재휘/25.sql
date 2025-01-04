SELECT name 
FROM PlayableCharacter 
WHERE id not in (SELECT PlayableCharacter.id
                 FROM (User join RaisingCharacter on User.id=owner_id)                       
                 join PlayableCharacter on cid=PlayableCharacter.id ) 
ORDER BY name;