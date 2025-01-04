SELECT max(level) 
FROM User, RaisingCharacter 
WHERE User.id = RaisingCharacter.owner_id AND User.name="Chang";