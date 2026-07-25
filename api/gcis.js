module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { type, q } = req.query;
  let url = '';

  if (type === 'taxid') {
    url = `https://data.gcis.nat.gov.tw/od/data/api/236BF29E-BD41-43FC-BFA4-5E7E1DC292C0?$format=json&$filter=Business_Accounting_NO eq ${q}&$skip=0&$top=1`;
  } else if (type === 'name') {
    url = `https://data.gcis.nat.gov.tw/od/data/api/236BF29E-BD41-43FC-BFA4-5E7E1DC292C0?$format=json&$filter=Company_Name like ${encodeURIComponent(q)}&$skip=0&$top=5`;
  } else {
    return res.status(400).json({ error: 'type must be taxid or name' });
  }

  try {
    const r = await fetch(url);
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
