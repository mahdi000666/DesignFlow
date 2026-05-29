check timer sessions in admin panel
try 2 timer sessions at the same time
change profile specific info in settings

when the jury ask to show a functionality or "where is this located in code" how do i know whether i should go to the frontend or backend, and if backend if i should go to views or serializers.





1. So what do u recommend? enforce depth limit or keep this way?
2. select_related('project') so the return of this func call, where is it being used in the code?
3. so why |= instead of += in the logs filter?
4. the API response was this:
```
{
  "suggested_hours": 10.0,
  "reasoning": "The estimate is based on the historical data of similar tasks, particularly 'Logo Concept Exploration', which suggests that a comprehensive logo design task would require around 10 hours.",
  "estimated_hours": 10.0
}
```
Is the format correct? Also how do i check my json requests to compare with the output?


1. so + is not incorrect its just that Q doesnt define it?
2. I remove historical boolean check since i dont want it anymore. Do i just modify return Response line?
3. When I said how do i check my json requests, i meant the json request sent to the AI along with the historical logs, so we can check if its correctly utilizing the historical data and returning valid estimations.

