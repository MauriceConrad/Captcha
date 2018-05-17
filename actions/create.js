module.exports = async function(req, res) {
  // Get id and the data properties from created captcha  we want to keep
  const { type, description, data, id } = await this.create();
  // Send the existing data properties to the client
  res.json({ type, description, data, id });
}
