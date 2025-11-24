from datetime import datetime
from rest_framework.filters import BaseFilterBackend

class StatusDateFilterBackend(BaseFilterBackend):
    def filter_queryset(self, request, queryset, view):
        status = request.query_params.get("status")
        if status and hasattr(queryset.model, "status"):
            queryset = queryset.filter(status__iexact=status)

        from_date = request.query_params.get("from")
        to_date = request.query_params.get("to")

        # Default to created_at, fallback to uploaded_at if available
        date_field = "created_at"
        if hasattr(queryset.model, "uploaded_at"):
            date_field = "uploaded_at"

        if from_date:
            try:
                dt = datetime.fromisoformat(from_date)
                queryset = queryset.filter(**{f"{date_field}__date__gte": dt})
            except ValueError:
                pass

        if to_date:
            try:
                dt = datetime.fromisoformat(to_date)
                queryset = queryset.filter(**{f"{date_field}__date__lte": dt})
            except ValueError:
                pass

        return queryset