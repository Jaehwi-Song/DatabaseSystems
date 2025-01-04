SELECT name
FROM User join RaisingCharacter on User.id=owner_id
WHERE country="USA"
GROUP BY User.id
HAVING avg(level)=(SELECT max(avg_level)
                   FROM (SELECT avg(level) as avg_level
                         FROM User join RaisingCharacter on User.id=owner_id
                         WHERE country="USA"
                         GROUP BY User.id)
                         as Avg_usa_level);