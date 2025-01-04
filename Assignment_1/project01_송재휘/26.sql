SELECT country, max(level) 
FROM User join RaisingCharacter on User.id=owner_id 
GROUP BY country 
ORDER BY max(level) desc;