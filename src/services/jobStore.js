const jobs = new Map();

function create(id, data = {}) {
  const payload = {
    status: "pending",
    created: Date.now(),
    updated: Date.now(),
    ...data
  };
  jobs.set(id, payload);
  return payload;
}

function update(id, data = {}) {
  const nextPayload = {
    ...(jobs.get(id) || {
      status: "pending",
      created: Date.now()
    }),
    ...data,
    updated: Date.now()
  };
  jobs.set(id, nextPayload);
  return nextPayload;
}

function get(id) {
  return jobs.get(id);
}

module.exports = {
  create,
  update,
  get
};
