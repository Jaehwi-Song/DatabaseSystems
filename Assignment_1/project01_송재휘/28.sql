SELECT name
FROM PlayableCharacter
WHERE branch=(SELECT branch
              FROM PlayableCharacter
              WHERE name="Luminus")
ORDER BY name;