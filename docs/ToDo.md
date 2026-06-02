// desingner
amine.karray@designflow.tn

// client
aziz.chaabane@chaabaneimmo.tn

mahdimlika2022@gmail.com













































avgx_resolution_duration = (
    Feedback.objects
    .filter(status='Resolved', resolved_at__isnull=False)
    .annotate(
        resolution_time=ExpressionWrapper(
            DbF('resolved_at') - DbF('submitted_at'),
            output_field=DurationField(),
        )
    )
    .aggregate(avg=Avg('resolution_time'))['avg']
)

avgx_resolution_hours = (
    round(avxg_resolution_duration.total_seconds() / 3600, 1)
    if avxg_resolution_duration is not None
    else None
)