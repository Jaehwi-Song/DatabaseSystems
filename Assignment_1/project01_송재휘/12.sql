SELECT User.name 
FROM (USER join Youtuber on id=youtuber_id) 
      join Country on User.country=Country.name 
WHERE continent="Asia";