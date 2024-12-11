export const printWithBorder = (message: string) => {
  const border = '='.repeat(message.length + 4);
  (`\n${border}`);
  (`| ${message} |`);
  (`${border}\n`);
};
