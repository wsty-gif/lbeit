
(async function(){
  const rootForm = document.getElementById("search-form");
  const rootResults = document.getElementById("results");

  const results = new SearchResults(rootResults);
  const form = new SearchForm(rootForm, (list)=>{
    results.render(list);
  });

  const all = await DataService.getAllAccounts();
  results.render(all);
})();
