import { Command, Option } from "commander";
import pkg from "../package.json";
import { buildInvertedIndex, keywordSearch } from "./commands/keyword_search";

const program = new Command();

program
  .name(pkg.name)
  .description(pkg.description)
  .version(pkg.version);

program
  .command('search')
  .description("Search using a specific type")
  .argument("<query>", "Search query")
  .addOption(new Option("-t, --type <type>", "Search type").choices(['keyword']))
  .option("-k, --topK <number>", "Number of results", parseInt, 5)
  .action(async (query, options) => {
    const { type, topK } = options;

    console.log("Searching for:", query);

    switch (type) {
      case 'keyword':
        const results = await keywordSearch(query, topK);

        results.forEach((result, index) => {
          console.log(`${index + 1}. ${result.title}`);
        });

        break;
      default:
        console.error("Invalid type");
        process.exit(1);
    }
  });

program
  .command('build')
  .description('Build search index for a specific type')
  .addOption(new Option("-t, --type <type>", "Search type").choices(['keyword']))
  .action(async (options) => {
    const { type } = options;

    switch (type) {
      case 'keyword':
        await buildInvertedIndex();
        break;
      default:
        console.error("Invalid type");
        process.exit(1);
    }
  });

program.parse(process.argv);
