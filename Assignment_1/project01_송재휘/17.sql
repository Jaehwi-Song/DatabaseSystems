SELECT nickname
FROM Youtuber join RaisingCharacter on youtuber_id=owner_id
WHERE level=(SELECT max(level)
             FROM Youtuber join RaisingCharacter on youtuber_id=owner_id);