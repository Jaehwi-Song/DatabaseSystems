SELECT name, sum(level)
FROM (Youtuber join User on youtuber_id=id)
      join RaisingCharacter on User.id=owner_id
GROUP BY youtuber_id
ORDER BY sum(level) desc;