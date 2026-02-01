function filterTasks(list, { filter = 'all', search = '', categories = [] } = {}) {
  let src = Array.isArray(list) ? list : [];

  // status filter
  if (filter !== 'all') {
    src = src.filter(e => (e.status || 'pending') === filter);
  }

  // search
  const q = (search || '').trim().toLowerCase();
  if (q) {
    src = src.filter(e => {
      const catName =
        categories.find(c => c.id === e.catId)?.name || '';

      return [
        e.title,
        e.taskType,
        e.location,
        e.notes,
        catName,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }

  return src;
}

window.filterTasks = filterTasks;
