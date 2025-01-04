SELECT min(level)
FROM User join RaisingCharacter on User.id=owner_id
GROUP BY User.id
HAVING max(level)=(SELECT max(total_level)
                   FROM(SELECT max(level) as total_level
                        FROM User join RaisingCharacter on User.id=owner_id
                        GROUP BY User.id) as Id_max_level);