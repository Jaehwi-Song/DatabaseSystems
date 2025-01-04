SELECT User.name 
FROM (User join RaisingCharacter on User.id=owner_id)
      join PlayableCharacter on cid=PlayableCharacter.id 
WHERE PlayableCharacter.name like "n%" and country="Korea" 
ORDER BY User.name;