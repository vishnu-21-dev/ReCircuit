const fs = require('fs');
const files = [
  'frontend/src/pages/ShopPage.jsx',
  'frontend/src/pages/SellPartPage.jsx',
  'frontend/src/pages/MatchPage.jsx',
  'frontend/src/pages/MatchesPage.jsx',
  'frontend/src/pages/BuyerResultsPage.jsx',
  'frontend/src/pages/BuyerPage.jsx'
];

for (const file of files) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    
    content = content.replace(/function NavHeader\(\) \{[\s\S]*?<\/header>\n\s*\}/g, '');
    content = content.replace(/function RecircuitIcon\(\{.*?\}\) \{[\s\S]*?<\/svg>\n\s*\}/g, '');
    
    if (!content.includes('import Navbar')) {
      content = "import Navbar from '../components/Navbar';\n" + content;
    }
    
    content = content.replace(/<NavHeader \/>/g, '<Navbar />');
    
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  } catch (err) {
    console.error('Failed on ' + file, err.message);
  }
}
