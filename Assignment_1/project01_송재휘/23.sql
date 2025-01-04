SELECT User.name, PlayableCharacter.name
FROM (User join RaisingCharacter on User.id=owner_id)
      join PlayableCharacter on cid=PlayableCharacter.id
ORDER BY User.name, PlayableCharacter.name;