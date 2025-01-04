SELECT nickname
FROM RaisingCharacter
WHERE level = (SELECT MAX(level)
               FROM RaisingCharacter);