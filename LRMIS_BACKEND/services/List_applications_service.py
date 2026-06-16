async def list_applications_service(repository, skip=0, limit=10, filters=None):

    query = filters if filters else {}

    data = list(
        repository.collection.find(query)
        .skip(skip)
        .limit(limit)
    )

    total = await repository.collection.count_documents(query)

    return {
        "data": data,
        "total": total,
        "page_size": limit,
        "skip": skip
    }