from rest_framework.pagination import PageNumberPagination

class DefaultPagination(PageNumberPagination):
    page_size = 25                      # default per page
    page_size_query_param = "page_size" # allow ?page_size=50
    max_page_size = 100                 # hard cap
    invalid_page_message = "Invalid page number."