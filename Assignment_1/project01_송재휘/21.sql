SELECT distinct PlayableCharacter.name 
FROM (User join RaisingCharacter on User.id=owner_id)
      join PlayableCharacter on cid=PlayableCharacter.id 
WHERE country="Korea" and 
      PlayableCharacter.name in (SELECT PlayableCharacter.name
                                 FROM (User join RaisingCharacter on User.id=owner_id)
                                 join PlayableCharacter on cid=PlayableCharacter.id 
                                 WHERE country="UK") 
ORDER BY PlayableCharacter.name;