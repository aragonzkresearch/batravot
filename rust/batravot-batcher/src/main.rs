use std::process;
use batravot_batcher::{InputMode, run};

/// This is the main function that initiates the Batcher application
/// If there are any errors in the execution and prints them in error stream
fn main() {


    // Check if there is a `-f` or `--file` argument set, if so, the input mode will be file
    // And there should be a file path as the next argument
    // If not, the input mode will be stdin
    let mut iter = std::env::args().skip_while(|x| x != "-f" && x != "--file");
    let input_mode = if iter.next().is_some() {
        if let Some(file_path) = iter.next() {
            InputMode::File(file_path)
        } else {
            eprintln!("Error: No file path provided after `-f` or `--file` flag");
            process::exit(1);
        }
    } else {
        InputMode::Stdin
    };

    run(input_mode).unwrap_or_else(|err| {
        eprintln!("An error occurred: {}", err);
        process::exit(1);
    });
}

