SELECT name, nickname 
FROM User, RaisingCharacter 
WHERE User.id = RaisingCharacter.owner_id AND nickname like "j%" 
ORDER BY name;